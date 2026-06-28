from __future__ import annotations

from sqlalchemy.orm import Session

from app.dominio.erros import SchemaVersionNaoSuportado, TipoComandoNaoRegistrado
from app.dominio.modelos.execucao import Execucao
from app.dominio.modelos.projeto import Projeto
from app.executor.comando import SCHEMA_VERSION_ATUAL, Comando
from app.executor.executores.base import ExecutorEspecifico
from app.executor.executores.skill import ExecutorSkill
from app.executor.resultado import ResultadoExecucao
from app.executor.tipos import TipoComando
from app.eventos.publisher import NoOpPublisher, Publisher
from app.habilidades.registro import obter as obter_habilidade
from app.ia.context_builder.builder import ContextBuilder


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

        # 3. Garantir projeto (default = raiz).
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

        # 6. Persistir execução (com prompt_template + prompt_version).
        prompt_template = None
        prompt_version = None
        if comando.tipo == TipoComando.SKILL:
            try:
                hab = obter_habilidade(comando.alvo)
                prompt_template = hab.prompt_template
                prompt_version = hab.prompt_version
            except Exception:
                pass

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
