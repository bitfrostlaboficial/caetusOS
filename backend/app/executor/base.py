from __future__ import annotations

from sqlalchemy.orm import Session

from app.dominio.erros import NaoEncontrado, SchemaVersionNaoSuportado, TipoComandoNaoRegistrado
from app.dominio.modelos.asset import Asset
from app.dominio.modelos.execucao import Execucao
from app.dominio.modelos.projeto import Projeto
from app.executor.comando import SCHEMA_VERSION_ATUAL, Comando
from app.executor.executores.base import ExecutorEspecifico
from app.executor.executores.skill import ExecutorSkill
from app.executor.resultado import AssetRef, ResultadoExecucao
from app.executor.tipos import TipoComando
from app.eventos.publisher import NoOpPublisher, Publisher
from app.habilidades.registro import obter as obter_habilidade
from app.ia.context_builder.builder import ContextBuilder
from app.infraestrutura.armazenamento.filesystem import obter_storage


class Executor:
    """Único ponto de entrada de qualquer execução (§1 regra 1)."""

    def __init__(
        self,
        sessao: Session,
        registro: dict[TipoComando, ExecutorEspecifico] | None = None,
        publisher: Publisher | None = None,
    ) -> None:
        self.sessao = sessao
        self.registro = registro or {TipoComando.SKILL: ExecutorSkill()}
        self.publisher = publisher or NoOpPublisher()
        self.context_builder = ContextBuilder(sessao)

    def executar(self, comando: Comando) -> ResultadoExecucao:
        # 1. Validar schema_version (§5 — apenas v1 no MVP).
        if comando.schema_version != SCHEMA_VERSION_ATUAL:
            raise SchemaVersionNaoSuportado(
                f"schema_version {comando.schema_version} não suportado (esperado {SCHEMA_VERSION_ATUAL})"
            )

        # 2. Resolver ExecutorEspecifico por tipo.
        especifico = self.registro.get(comando.tipo)
        if especifico is None:
            raise TipoComandoNaoRegistrado(f"tipo '{comando.tipo}' não registrado")

        # 2b. Habilidade inexistente é erro de endereçamento (404), não falha de execução:
        #     detectar ANTES de montar contexto e de gravar qualquer coisa.
        habilidade = None
        if comando.tipo == TipoComando.SKILL:
            habilidade = obter_habilidade(comando.alvo)  # levanta HabilidadeNaoRegistrada

        # 3. Garantir projeto (default = raiz). Um projeto informado pelo cliente precisa
        #    pertencer à empresa do comando (404 para não revelar projetos alheios).
        if comando.projeto_id is not None:
            projeto = self.sessao.get(Projeto, comando.projeto_id)
            if projeto is None or projeto.empresa_id != comando.empresa_id:
                raise NaoEncontrado("projeto não encontrado")
        if comando.projeto_id is None:
            raiz = (
                self.sessao.query(Projeto)
                .filter(Projeto.empresa_id == comando.empresa_id, Projeto.eh_raiz.is_(True))
                .first()
            )
            if raiz is None:
                raise RuntimeError("empresa sem projeto raiz")
            comando.projeto_id = raiz.id

        # 4. Montar contexto pronto.
        contexto = self.context_builder.montar(comando)

        # 5. Delegar execução.
        resultado = especifico.executar(comando, contexto)

        # 5b. Arquivos gerados pela habilidade viram Assets (origem GERADO) na MESMA transação
        #     da execução; se a execução falhou, não deixa arquivos órfãos no storage.
        if resultado.sucesso:
            resultado.arquivos = self._registrar_assets(comando, contexto)
        else:
            self._descartar_arquivos(contexto)

        # 6. Persistir execução (com prompt_template + prompt_version).
        prompt_template = habilidade.prompt_template if habilidade else None
        prompt_version = habilidade.prompt_version if habilidade else None

        registro_exec = Execucao(
            id=resultado.execucao_id,
            empresa_id=comando.empresa_id,
            projeto_id=comando.projeto_id,
            usuario_id=comando.usuario_id,
            tipo_comando=comando.tipo.value,
            alvo=comando.alvo,
            origem=comando.origem.value,
            correlacao_id=comando.correlacao_id,
            schema_version=comando.schema_version,
            entrada_jsonb=comando.entrada,
            saida_jsonb=resultado.dados,
            provedor=resultado.metricas.provedor,
            custo=resultado.metricas.custo,
            tokens_in=resultado.metricas.tokens_in,
            tokens_out=resultado.metricas.tokens_out,
            latencia_ms=resultado.metricas.latencia_ms,
            prompt_template=prompt_template,
            prompt_version=prompt_version,
            status="sucesso" if resultado.sucesso else "erro",
            erro=resultado.erro.mensagem if resultado.erro else None,
        )
        self.sessao.add(registro_exec)
        self.sessao.flush()

        # 7. Publicar evento (NoOp no MVP).
        self.publisher.publicar(
            "execucao.concluida",
            {
                "execucao_id": str(resultado.execucao_id),
                "empresa_id": str(comando.empresa_id),
                "alvo": comando.alvo,
                "sucesso": resultado.sucesso,
            },
        )
        return resultado

    def _registrar_assets(self, comando: Comando, contexto) -> list[AssetRef]:
        refs: list[AssetRef] = []
        for item in contexto.assets_gerados:
            asset = Asset(
                empresa_id=comando.empresa_id,
                projeto_id=comando.projeto_id,
                categoria=item["categoria"],
                origem="GERADO",
                escopo="projeto",
                caminho_storage=item["caminho_storage"],
                mime=item.get("mime"),
                tamanho=item.get("tamanho"),
                metadados_jsonb=item.get("metadados") or {},
                criado_por=comando.usuario_id,
            )
            self.sessao.add(asset)
            self.sessao.flush()
            refs.append(
                AssetRef(
                    id=asset.id,
                    categoria=asset.categoria,
                    caminho_storage=asset.caminho_storage,
                    mime=asset.mime,
                )
            )
        return refs

    @staticmethod
    def _descartar_arquivos(contexto) -> None:
        if not contexto.assets_gerados:
            return
        storage = obter_storage()
        for item in contexto.assets_gerados:
            try:
                storage.remover(item["caminho_storage"])
            except Exception:  # noqa: BLE001
                pass
