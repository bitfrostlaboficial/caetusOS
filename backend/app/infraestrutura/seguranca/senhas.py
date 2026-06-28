from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

_hasher = PasswordHasher()


def gerar_hash(senha: str) -> str:
    return _hasher.hash(senha)


def verificar(senha: str, hash_armazenado: str) -> bool:
    try:
        return _hasher.verify(hash_armazenado, senha)
    except VerifyMismatchError:
        return False
