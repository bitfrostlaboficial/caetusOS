"""Camada de observabilidade — Fase 6.

Componentes:
- `contexto`: ContextVars (request_id, empresa_id, usuario_id, missao)
- `logger`: configuração de logging estruturada/colorida/JSON-ready
- `middleware`: RequestID + LoggingHTTP

Pensada para integração futura com Loki/Grafana/OpenTelemetry sem refactor.
"""
from app.infraestrutura.observabilidade.contexto import (  # noqa: F401
    contexto_atual,
    get_request_id,
    set_contexto,
    set_request_id,
)
from app.infraestrutura.observabilidade.logger import (  # noqa: F401
    configurar_logging,
    log_evento,
)
