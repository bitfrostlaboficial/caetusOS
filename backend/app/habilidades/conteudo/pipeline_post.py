from __future__ import annotations

import base64
import json
import re
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx

from app.executor.executores.base import Contexto
from app.ia.prompts._runtime import (
    construir_environment,
    normalizar_para_template,
)
from app.ia.roteador import executar_missao
from app.infraestrutura.armazenamento.filesystem import obter_storage

_PROMPTS_DIR = Path(__file__).resolve().parent.parent.parent / "ia" / "prompts"
_jinja = construir_environment(_PROMPTS_DIR)

_PLACEHOLDER_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgG"
    "MmH57XAAAAABJRU5ErkJggg=="
)


@dataclass
class EntradaPost:
    tema: str
    rede: str = "instagram"
    objetivo: str = "engajamento"
    descricao_imagem: str | None = None
    publicar_automaticamente: bool = False


@dataclass
class ConteudoPost:
    titulo: str
    legenda: str
    hashtags: list[str]
    cta: str
    prompt_visual: dict[str, Any]
    prompt_visual_texto: str
    resposta_bruta: str
    provider: str
    modelo: str | None
    tokens_in: int = 0
    tokens_out: int = 0
    custo: float = 0.0
    latencia_ms: int = 0


@dataclass
class ImagemPost:
    conteudo: bytes
    mime: str
    extensao: str
    url_origem: str | None
    provider: str
    modelo: str | None
    metadata: dict[str, Any] = field(default_factory=dict)
    latencia_ms: int = 0


@dataclass
class PersistenciaPost:
    base: str
    imagem: str
    legenda: str
    prompt_imagem: str
    metadata: str


@dataclass
class PublicacaoPost:
    rede: str
    status: str
    links: list[str] = field(default_factory=list)
    detalhes: dict[str, Any] = field(default_factory=dict)


class GeradorTextoPost:
    def gerar(self, entrada: EntradaPost, contexto: Contexto) -> ConteudoPost:
        template = _jinja.get_template("criar_post.v1.jinja2")
        prompt = template.render(
            identidade=normalizar_para_template(contexto.identidade) or {},
            conhecimento=normalizar_para_template(contexto.conhecimento) or [],
            memoria=normalizar_para_template(contexto.memoria) or [],
            historico_recente=normalizar_para_template(contexto.historico_recente) or [],
            entrada={
                "tema": entrada.tema,
                "rede": entrada.rede,
                "objetivo": entrada.objetivo,
                "descricao_imagem": entrada.descricao_imagem,
            },
        )
        inicio = time.perf_counter()
        resposta = executar_missao(
            "criar_post",
            prompt,
            max_tokens=1800,
            empresa_id=contexto.extras.get("empresa_id"),
            usuario_id=contexto.extras.get("usuario_id"),
            pipeline="conteudo.criar_post",
            metadata={"etapa": "texto"},
        )
        latencia_ms = int((time.perf_counter() - inicio) * 1000)
        dados = _extrair_json(resposta.texto)
        if not dados:
            dados = _fallback_conteudo(entrada, resposta.texto)

        prompt_visual = _normalizar_prompt_visual(dados.get("prompt_visual"), entrada)
        hashtags = _normalizar_hashtags(dados.get("hashtags"))
        cta = str(dados.get("cta") or "").strip()
        legenda = str(dados.get("legenda") or dados.get("corpo") or resposta.texto).strip()
        if cta and cta not in legenda:
            legenda = f"{legenda}\n\n{cta}".strip()
        if hashtags and not any(h in legenda for h in hashtags):
            legenda = f"{legenda}\n\n{' '.join(hashtags)}".strip()

        return ConteudoPost(
            titulo=str(dados.get("titulo") or entrada.tema).strip()[:120],
            legenda=legenda,
            hashtags=hashtags,
            cta=cta,
            prompt_visual=prompt_visual,
            prompt_visual_texto=json.dumps(prompt_visual, ensure_ascii=False, indent=2),
            resposta_bruta=resposta.texto,
            provider=resposta.provedor,
            modelo=resposta.modelo,
            tokens_in=resposta.tokens_in,
            tokens_out=resposta.tokens_out,
            custo=resposta.custo,
            latencia_ms=latencia_ms,
        )

    def ajustar_legenda(
        self,
        conteudo: ConteudoPost,
        imagem: ImagemPost,
        contexto: Contexto,
    ) -> ConteudoPost:
        if not imagem.metadata.get("ajustar_legenda"):
            return conteudo
        prompt = (
            "Ajuste brevemente a legenda abaixo para ficar coerente com a imagem gerada. "
            "Preserve CTA e hashtags. Responda apenas com a legenda final.\n\n"
            f"Legenda:\n{conteudo.legenda}\n\n"
            f"Metadados da imagem:\n{json.dumps(imagem.metadata, ensure_ascii=False)}"
        )
        inicio = time.perf_counter()
        resposta = executar_missao(
            "criar_post",
            prompt,
            max_tokens=700,
            empresa_id=contexto.extras.get("empresa_id"),
            usuario_id=contexto.extras.get("usuario_id"),
            pipeline="conteudo.criar_post",
            metadata={"etapa": "ajuste_legenda"},
        )
        texto = resposta.texto.strip()
        if not texto or texto.startswith("[stub "):
            return conteudo
        conteudo.legenda = texto
        conteudo.tokens_in += resposta.tokens_in
        conteudo.tokens_out += resposta.tokens_out
        conteudo.custo += resposta.custo
        conteudo.latencia_ms += int((time.perf_counter() - inicio) * 1000)
        return conteudo


class GeradorImagemPost:
    def gerar(self, prompt_visual: str, contexto: Contexto) -> ImagemPost:
        inicio = time.perf_counter()
        resposta = executar_missao(
            "conteudo_imagem_post",
            prompt_visual,
            max_tokens=300,
            empresa_id=contexto.extras.get("empresa_id"),
            usuario_id=contexto.extras.get("usuario_id"),
            pipeline="conteudo.criar_post",
            metadata={"etapa": "imagem"},
        )
        url = _extrair_url(resposta.texto)
        metadata: dict[str, Any] = {
            "resposta_bruta": resposta.texto,
            "url_origem": url,
        }
        conteudo = _PLACEHOLDER_PNG
        mime = "image/png"
        extensao = "png"
        if url:
            try:
                r = httpx.get(url, timeout=120)
                r.raise_for_status()
                conteudo = r.content
                mime = r.headers.get("content-type", "image/png").split(";")[0]
                extensao = _extensao_por_mime(mime)
            except Exception as exc:  # noqa: BLE001
                metadata["download_erro"] = str(exc)[:300]
        else:
            metadata["placeholder"] = True

        return ImagemPost(
            conteudo=conteudo,
            mime=mime,
            extensao=extensao,
            url_origem=url,
            provider=resposta.provedor,
            modelo=resposta.modelo,
            metadata=metadata,
            latencia_ms=int((time.perf_counter() - inicio) * 1000),
        )


class PersistenciaPostConhecimento:
    def __init__(self) -> None:
        self.storage = obter_storage()

    def salvar(
        self,
        entrada: EntradaPost,
        conteudo: ConteudoPost,
        imagem: ImagemPost,
        metadata: dict[str, Any],
        contexto: Contexto,
    ) -> PersistenciaPost:
        import json
        import hashlib
        from datetime import datetime, timezone

        agora = datetime.now(timezone.utc)
        empresa_id = contexto.extras.get("empresa_id") if contexto and contexto.extras else None

        if empresa_id:
            # Hash dos conteudos para caminhos unicos padrão da plataforma
            hash_img = hashlib.sha256(imagem.conteudo).hexdigest()
            hash_leg = hashlib.sha256(conteudo.legenda.encode("utf-8")).hexdigest()
            hash_prompt = hashlib.sha256(conteudo.prompt_visual_texto.encode("utf-8")).hexdigest()

            # Nomeação amigável e timestamped para organizar no Explorer da Base de Conhecimento
            ts = agora.strftime("%Y%m%d_%H%M%S")
            caminho_imagem = f"empresas/{empresa_id}/conhecimento/{hash_img}-post_{ts}_imagem.{imagem.extensao}"
            caminho_legenda = f"empresas/{empresa_id}/conhecimento/{hash_leg}-post_{ts}_legenda.md"
            caminho_prompt = f"empresas/{empresa_id}/conhecimento/{hash_prompt}-post_{ts}_prompt.txt"

            metadata_completo = {
                "tema": entrada.tema,
                "rede": entrada.rede,
                "objetivo": entrada.objetivo,
                "data": agora.isoformat(),
                "missao": "conteudo.criar_post",
                "provider_texto": conteudo.provider,
                "modelo_texto": conteudo.modelo,
                "provider_imagem": imagem.provider,
                "modelo_imagem": imagem.modelo,
                "legenda": conteudo.legenda,
                "hashtags": conteudo.hashtags,
                "cta": conteudo.cta,
                "prompt_utilizado": conteudo.prompt_visual_texto,
                "prompt_visual": conteudo.prompt_visual,
                "status_publicacao": metadata.get("publicacao", {}).get("status") if isinstance(metadata, dict) else None,
                "detalhes_publicacao": metadata.get("publicacao", {}).get("detalhes") if isinstance(metadata, dict) else None,
                "arquivos": {
                    "imagem": caminho_imagem,
                    "legenda": caminho_legenda,
                    "prompt": caminho_prompt,
                },
                "metricas": metadata,
            }

            meta_bytes = json.dumps(metadata_completo, ensure_ascii=False, indent=2, default=str).encode("utf-8")
            hash_meta = hashlib.sha256(meta_bytes).hexdigest()
            caminho_metadata = f"empresas/{empresa_id}/conhecimento/{hash_meta}-post_{ts}_metadata.json"
            metadata_completo["arquivos"]["metadata"] = caminho_metadata

            # Salvar fisicamente no Storage
            self.storage.salvar(caminho_imagem, imagem.conteudo)
            self.storage.salvar(caminho_legenda, conteudo.legenda.encode("utf-8"))
            self.storage.salvar(caminho_prompt, conteudo.prompt_visual_texto.encode("utf-8"))
            self.storage.salvar(caminho_metadata, meta_bytes)

            # Registrar os arquivos de legenda, imagem, prompt e metadados no banco de dados para a Base de Conhecimento
            from app.infraestrutura.banco.sessao import SessionLocal
            from app.dominio.modelos.documento_conhecimento import DocumentoConhecimento

            try:
                with SessionLocal() as db_sessao:
                    # Registrar legenda
                    doc_leg = DocumentoConhecimento(
                        empresa_id=empresa_id,
                        tipo="marketing",
                        caminho_storage=caminho_legenda,
                        hash=hash_leg,
                        versao=1,
                    )
                    db_sessao.add(doc_leg)

                    # Registrar imagem
                    doc_img = DocumentoConhecimento(
                        empresa_id=empresa_id,
                        tipo="marketing",
                        caminho_storage=caminho_imagem,
                        hash=hash_img,
                        versao=1,
                    )
                    db_sessao.add(doc_img)

                    # Registrar prompt
                    doc_prompt = DocumentoConhecimento(
                        empresa_id=empresa_id,
                        tipo="marketing",
                        caminho_storage=caminho_prompt,
                        hash=hash_prompt,
                        versao=1,
                    )
                    db_sessao.add(doc_prompt)

                    # Registrar metadata
                    doc_meta = DocumentoConhecimento(
                        empresa_id=empresa_id,
                        tipo="marketing",
                        caminho_storage=caminho_metadata,
                        hash=hash_meta,
                        versao=1,
                    )
                    db_sessao.add(doc_meta)

                    db_sessao.commit()
            except Exception as db_exc:
                import logging
                logging.getLogger("caetusos.pipeline_post").error(f"Erro ao persistir documentos no banco de dados: {db_exc}")

            base = f"conhecimento/marketing/posts/{agora:%Y}/{agora:%m}/post_{ts}"
        else:
            base_mes = f"conhecimento/marketing/posts/{agora:%Y}/{agora:%m}"
            base = self._proximo_diretorio(base_mes)
            caminho_imagem = f"{base}/imagem.{imagem.extensao}"
            caminho_legenda = f"{base}/legenda.md"
            caminho_prompt = f"{base}/prompt_imagem.md"
            caminho_metadata = f"{base}/metadata.json"

            metadata_fallback = {
                **metadata,
                "data": agora.isoformat(),
                "tema": entrada.tema,
                "rede": entrada.rede,
                "missao": "conteudo.criar_post",
                "arquivos": {
                    "imagem": caminho_imagem,
                    "legenda": caminho_legenda,
                    "prompt_imagem": caminho_prompt,
                    "metadata": caminho_metadata,
                },
            }

            self.storage.salvar(caminho_imagem, imagem.conteudo)
            self.storage.salvar(caminho_legenda, conteudo.legenda.encode("utf-8"))
            self.storage.salvar(caminho_prompt, conteudo.prompt_visual_texto.encode("utf-8"))
            self.storage.salvar(
                caminho_metadata,
                json.dumps(metadata_fallback, ensure_ascii=False, indent=2, default=str).encode("utf-8"),
            )

        return PersistenciaPost(
            base=base,
            imagem=caminho_imagem,
            legenda=caminho_legenda,
            prompt_imagem=caminho_prompt,
            metadata=caminho_metadata,
        )

    def _proximo_diretorio(self, base_mes: str) -> str:
        indice = 1
        while True:
            base = f"{base_mes}/post_{indice:03d}"
            if not self.storage.existe(f"{base}/metadata.json"):
                return base
            indice += 1


class PublicadorPost:
    def publicar(
        self,
        entrada: EntradaPost,
        conteudo: ConteudoPost,
        imagem: ImagemPost,
    ) -> PublicacaoPost:
        if not entrada.publicar_automaticamente:
            return PublicacaoPost(rede=entrada.rede, status="nao_solicitado")
        if entrada.rede.lower() != "instagram":
            return PublicacaoPost(
                rede=entrada.rede,
                status="rede_nao_suportada",
                detalhes={"suportadas": ["instagram"]},
            )
        return InstagramPublicador().publicar(conteudo, imagem)


class InstagramPublicador:
    def publicar(self, conteudo: ConteudoPost, imagem: ImagemPost) -> PublicacaoPost:
        from app.configuracao import config

        access_token = getattr(config, "instagram_access_token", "")
        account_id = getattr(config, "instagram_account_id", "")
        api_version = getattr(config, "instagram_api_version", "v20.0")
        if not access_token or not account_id:
            return PublicacaoPost(
                rede="instagram",
                status="pendente_configuracao",
                detalhes={
                    "motivo": "Defina INSTAGRAM_ACCESS_TOKEN e INSTAGRAM_ACCOUNT_ID.",
                },
            )
        if not imagem.url_origem:
            return PublicacaoPost(
                rede="instagram",
                status="pendente_url_publica",
                detalhes={"motivo": "Instagram requer uma URL publica da imagem."},
            )

        base_url = f"https://graph.facebook.com/{api_version}/{account_id}"
        try:
            container = httpx.post(
                f"{base_url}/media",
                data={
                    "image_url": imagem.url_origem,
                    "caption": conteudo.legenda,
                    "access_token": access_token,
                },
                timeout=60,
            )
            container.raise_for_status()
            creation_id = container.json().get("id")
            publish = httpx.post(
                f"{base_url}/media_publish",
                data={"creation_id": creation_id, "access_token": access_token},
                timeout=60,
            )
            publish.raise_for_status()
            publish_data = publish.json()
            media_id = publish_data.get("id")

            links = []
            if media_id:
                try:
                    # Buscar o permalink real da midia publicada sem inventar links
                    media_info = httpx.get(
                        f"https://graph.facebook.com/{api_version}/{media_id}",
                        params={"fields": "permalink", "access_token": access_token},
                        timeout=10,
                    )
                    media_info.raise_for_status()
                    permalink = media_info.json().get("permalink")
                    if permalink:
                        links.append(permalink)
                except Exception as info_exc:
                    import logging
                    logging.getLogger("caetusos.pipeline_post").warning(
                        f"Nao foi possivel obter permalink real do Instagram para media_id {media_id}: {info_exc}"
                    )

            return PublicacaoPost(
                rede="instagram",
                status="publicado",
                links=links,
                detalhes={
                    "media_id": media_id,
                    "creation_id": creation_id,
                    "resposta": publish_data,
                    "erros": None
                },
            )
        except httpx.HTTPStatusError as exc:
            try:
                erro_detalhe = exc.response.json()
            except Exception:
                erro_detalhe = exc.response.text
            return PublicacaoPost(
                rede="instagram",
                status="erro",
                detalhes={
                    "erro": str(exc),
                    "resposta": erro_detalhe,
                    "erros": [erro_detalhe]
                }
            )
        except Exception as exc:  # noqa: BLE001
            return PublicacaoPost(
                rede="instagram",
                status="erro",
                detalhes={
                    "erro": str(exc)[:500],
                    "erros": [str(exc)]
                },
            )


class PipelineCriarPost:
    def __init__(self) -> None:
        self.texto = GeradorTextoPost()
        self.imagem = GeradorImagemPost()
        self.persistencia = PersistenciaPostConhecimento()
        self.publicador = PublicadorPost()

    def executar(self, entrada: EntradaPost, contexto: Contexto) -> dict[str, Any]:
        inicio = time.perf_counter()
        contexto.registrar_evento(
            "pipeline.iniciado",
            "Pipeline de criacao de post iniciado",
            tema=entrada.tema,
            rede=entrada.rede,
        )
        conteudo = self.texto.gerar(entrada, contexto)
        contexto.registrar_evento(
            "ia.texto",
            "Legenda e prompt visual gerados",
            nivel="sucesso",
            provedor=conteudo.provider,
            modelo=conteudo.modelo,
        )
        imagem = self.imagem.gerar(conteudo.prompt_visual_texto, contexto)
        contexto.registrar_evento(
            "ia.imagem",
            "Imagem gerada",
            nivel="sucesso",
            provedor=imagem.provider,
            modelo=imagem.modelo,
            url_origem=imagem.url_origem,
            placeholder=imagem.metadata.get("placeholder", False),
        )
        conteudo = self.texto.ajustar_legenda(conteudo, imagem, contexto)
        publicacao = self.publicador.publicar(entrada, conteudo, imagem)
        contexto.registrar_evento(
            "publicacao.status",
            f"Publicacao: {publicacao.status}",
            nivel="sucesso" if publicacao.status == "publicado" else "info",
            rede=publicacao.rede,
            links=publicacao.links,
        )

        metadata = {
            "provider_texto": conteudo.provider,
            "provider_imagem": imagem.provider,
            "modelos": {
                "texto": conteudo.modelo,
                "imagem": imagem.modelo,
            },
            "tokens": {
                "texto_in": conteudo.tokens_in,
                "texto_out": conteudo.tokens_out,
            },
            "custo": {
                "texto": conteudo.custo,
            },
            "imagem": imagem.metadata,
            "publicacao": publicacao.__dict__,
        }
        persistencia = self.persistencia.salvar(entrada, conteudo, imagem, metadata, contexto)
        contexto.registrar_evento(
            "arquivo.criado",
            "Arquivos salvos na Base de Conhecimento",
            nivel="sucesso",
            caminho=persistencia.base,
        )
        tempo_execucao_ms = int((time.perf_counter() - inicio) * 1000)
        return {
            "titulo": conteudo.titulo,
            "legenda": conteudo.legenda,
            "texto": conteudo.legenda,
            "hashtags": conteudo.hashtags,
            "cta": conteudo.cta,
            "prompt_utilizado": conteudo.prompt_visual_texto,
            "prompt_imagem": conteudo.prompt_visual,
            "imagem_gerada": {
                "caminho": persistencia.imagem,
                "mime": imagem.mime,
                "url_origem": imagem.url_origem,
                "metadata": imagem.metadata,
            },
            "imagem_url": imagem.url_origem,
            "caminho_salvo": persistencia.base,
            "arquivos_salvos": persistencia.__dict__,
            "status_publicacao": publicacao.status,
            "publicacao": publicacao.__dict__,
            "links": publicacao.links,
            "providers_utilizados": {
                "texto": {"provider": conteudo.provider, "modelo": conteudo.modelo},
                "imagem": {"provider": imagem.provider, "modelo": imagem.modelo},
            },
            "tempo_execucao_ms": tempo_execucao_ms,
            "_metricas": {
                "provedor": conteudo.provider,
                "modelo": conteudo.modelo,
                "tokens_in": conteudo.tokens_in,
                "tokens_out": conteudo.tokens_out,
                "custo": conteudo.custo,
                "latencia_ms": tempo_execucao_ms,
            },
        }


def _extrair_json(texto: str) -> dict[str, Any] | None:
    texto = (texto or "").strip()
    if not texto or texto.startswith("[stub "):
        return None
    try:
        valor = json.loads(texto)
        return valor if isinstance(valor, dict) else None
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", texto, re.DOTALL)
        if not match:
            return None
        try:
            valor = json.loads(match.group(0))
            return valor if isinstance(valor, dict) else None
        except json.JSONDecodeError:
            return None


def _fallback_conteudo(entrada: EntradaPost, texto: str) -> dict[str, Any]:
    legenda = texto.strip()
    if not legenda or legenda.startswith("[stub "):
        legenda = (
            f"{entrada.tema}\n\n"
            f"Uma publicacao para {entrada.rede} com foco em {entrada.objetivo}.\n\n"
            "Conte para a gente: como esse tema aparece no seu dia a dia?"
        )
    return {
        "titulo": entrada.tema,
        "legenda": legenda,
        "cta": "Fale com a gente para saber mais.",
        "hashtags": ["#marketing", "#conteudo", "#negocios"],
        "prompt_visual": None,
    }


def _normalizar_prompt_visual(valor: Any, entrada: EntradaPost) -> dict[str, Any]:
    if isinstance(valor, dict):
        base = valor
    else:
        base = {}
    return {
        "cenario": base.get("cenario") or entrada.descricao_imagem or f"Imagem sobre {entrada.tema}",
        "composicao": base.get("composicao") or "composicao limpa para post de rede social",
        "iluminacao": base.get("iluminacao") or "iluminacao natural e equilibrada",
        "estilo": base.get("estilo") or "profissional, moderno, alto acabamento",
        "cores": base.get("cores") or "cores alinhadas a identidade da marca",
        "proporcao": base.get("proporcao") or "1:1",
        "elementos_obrigatorios": base.get("elementos_obrigatorios") or [entrada.tema],
        "elementos_proibidos": base.get("elementos_proibidos") or [
            "marcas de terceiros",
            "texto ilegivel",
            "distorcoes em rostos ou maos",
        ],
        "texto_na_imagem": base.get("texto_na_imagem") or "sem texto, exceto se essencial",
    }


def _normalizar_hashtags(valor: Any) -> list[str]:
    if isinstance(valor, str):
        itens = valor.split()
    elif isinstance(valor, list):
        itens = [str(v) for v in valor]
    else:
        itens = []
    normalizadas = []
    for item in itens:
        tag = item.strip()
        if not tag:
            continue
        if not tag.startswith("#"):
            tag = f"#{tag}"
        normalizadas.append(tag)
    return normalizadas[:12]


def _extrair_url(texto: str) -> str | None:
    match = re.search(r"https?://[^\s'\"<>]+", texto or "")
    return match.group(0) if match else None


def _extensao_por_mime(mime: str) -> str:
    if mime == "image/jpeg":
        return "jpg"
    if mime == "image/webp":
        return "webp"
    return "png"
