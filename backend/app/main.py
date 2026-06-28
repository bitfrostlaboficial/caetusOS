from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import assets, auth, comandos, conhecimento, empresas, historico, identidade, memoria, projetos
from app.configuracao import config

# Importa o registro de habilidades para registrar o ExecutorSkill (efeito colateral intencional).
import app.habilidades.registro  # noqa: F401

app = FastAPI(title="Empresa IA — API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/saude")
def saude() -> dict:
    return {"ok": True, "version": "0.1.0", "schema_version": 1}


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
]:
    app.include_router(router, prefix="/v1")
