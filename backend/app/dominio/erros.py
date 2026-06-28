class ErroDominio(Exception):
    """Erro de regra de negócio."""


class NaoAutenticado(ErroDominio):
    pass


class NaoAutorizado(ErroDominio):
    pass


class NaoEncontrado(ErroDominio):
    pass


class JaExiste(ErroDominio):
    pass


class EntradaInvalida(ErroDominio):
    pass


class SchemaVersionNaoSuportado(ErroDominio):
    """Sprint 0: apenas schema_version == 1 é aceito (§5)."""


class HabilidadeNaoRegistrada(ErroDominio):
    pass


class TipoComandoNaoRegistrado(ErroDominio):
    pass
