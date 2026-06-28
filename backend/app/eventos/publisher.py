"""Publisher de eventos. MVP: NoOpPublisher (sem consumidores, §4)."""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod

log = logging.getLogger(__name__)


class Publisher(ABC):
    @abstractmethod
    def publicar(self, evento: str, payload: dict) -> None: ...


class NoOpPublisher(Publisher):
    def publicar(self, evento: str, payload: dict) -> None:
        log.debug("evento %s ignorado (NoOpPublisher): %s", evento, payload)
