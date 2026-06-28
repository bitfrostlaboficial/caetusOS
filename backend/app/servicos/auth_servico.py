from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.dominio.erros import JaExiste, NaoAutenticado
from app.dominio.modelos.usuario import Usuario
from app.infraestrutura.seguranca import jwt, refresh, senhas
from app.servicos.empresa_servico import EmpresaServico


class AuthServico:
    def __init__(self, sessao: Session) -> None:
        self.sessao = sessao

    def registrar(self, *, nome_empresa: str, email: str, senha: str) -> dict:
        """Registro inicial cria empresa + projeto raiz + usuário em UMA transação."""
        with self.sessao.begin():
            empresa = EmpresaServico(self.sessao).criar_empresa(nome=nome_empresa)
            if (
                self.sessao.query(Usuario)
                .filter(Usuario.empresa_id == empresa.id, Usuario.email == email)
                .first()
            ):
                raise JaExiste("e-mail já cadastrado nesta empresa")
            usuario = Usuario(empresa_id=empresa.id, email=email, senha_hash=senhas.gerar_hash(senha))
            self.sessao.add(usuario)
            self.sessao.flush()
            access = jwt.emitir_access_token(usuario.id, empresa.id)
            refresh_token = refresh.emitir(self.sessao, usuario.id)
        return {
            "access_token": access,
            "refresh_token": refresh_token,
            "empresa_id": str(empresa.id),
            "usuario_id": str(usuario.id),
        }

    def login(self, *, email: str, senha: str) -> dict:
        usuario = self.sessao.query(Usuario).filter(Usuario.email == email).first()
        if not usuario or not senhas.verificar(senha, usuario.senha_hash):
            raise NaoAutenticado("credenciais inválidas")
        with self.sessao.begin():
            access = jwt.emitir_access_token(usuario.id, usuario.empresa_id)
            refresh_token = refresh.emitir(self.sessao, usuario.id)
        return {
            "access_token": access,
            "refresh_token": refresh_token,
            "empresa_id": str(usuario.empresa_id),
            "usuario_id": str(usuario.id),
        }

    def rotacionar_refresh(self, refresh_token: str) -> dict:
        with self.sessao.begin():
            usuario_id, novo = refresh.rotacionar(self.sessao, refresh_token)
            usuario = self.sessao.get(Usuario, usuario_id)
            access = jwt.emitir_access_token(usuario.id, usuario.empresa_id)
        return {"access_token": access, "refresh_token": novo}
