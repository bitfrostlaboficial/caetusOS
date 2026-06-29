from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import (
    assets,
    auth,
    comandos,
    conhecimento,
    empresas,
    historico,
    ia,
    identidade,
    infraestrutura,
    memoria,
    projetos,
)
from app.configuracao import config
from app.infraestrutura.observabilidade.logger import configurar_logging
from app.infraestrutura.observabilidade.middleware import (
    LoggingHTTPMiddleware,
    RequestIDMiddleware,
)

# Registra modelos do SQLAlchemy (efeito colateral) — necessário para Alembic.
import app.dominio.modelos.ia_health  # noqa: F401
import app.dominio.modelos.ia_execucao  # noqa: F401

# Importa o registro de habilidades para registrar o ExecutorSkill (efeito colateral intencional).
import app.habilidades.registro  # noqa: F401
from app.ia.health import scheduler as ia_scheduler

configurar_logging(
    nivel=config.log_level,
    json_format=config.log_json,
    cor=config.log_color,
)
log = logging.getLogger("caetusos")


@asynccontextmanager
async def lifespan(_: FastAPI):
    if config.ia_health_scheduler_enabled:
        try:
            ia_scheduler.iniciar()
        except Exception:  # noqa: BLE001
            log.exception("Falha ao iniciar scheduler de IA — seguindo sem ele.")
    yield
    ia_scheduler.parar()


app = FastAPI(title="caetusOS — API", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/saude")
def saude() -> dict:
    return {"ok": True, "version": "0.2.0", "schema_version": 1}


for router in [
    auth.router,
    empresas.router,
    projetos.router,
    identidade.router,
    conhecimento.router,
    memoria.router,
    assets.router,
    comandos.router,
    historico.router,
    ia.router,
    infraestrutura.router,
]:
    app.include_router(router, prefix="/v1")
