from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.api.deps import obter_db
from app.dominio.erros import JaExiste, NaoAutenticado
from app.servicos.auth_servico import AuthServico

router = APIRouter(prefix="/auth", tags=["auth"])


class RegistroEntrada(BaseModel):
    nome_empresa: str
    email: EmailStr
    senha: str


class LoginEntrada(BaseModel):
    email: EmailStr
    senha: str


class RefreshEntrada(BaseModel):
    refresh_token: str


@router.post("/registrar")
def registrar(dados: RegistroEntrada, sessao: Session = Depends(obter_db)):
    try:
        return AuthServico(sessao).registrar(
            nome_empresa=dados.nome_empresa, email=dados.email, senha=dados.senha
        )
    except JaExiste as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@router.post("/login")
def login(dados: LoginEntrada, sessao: Session = Depends(obter_db)):
    try:
        return AuthServico(sessao).login(email=dados.email, senha=dados.senha)
    except NaoAutenticado as exc:
        raise HTTPException(status_code=401, detail=str(exc))


@router.post("/refresh")
def refresh(dados: RefreshEntrada, sessao: Session = Depends(obter_db)):
    try:
        return AuthServico(sessao).rotacionar_refresh(dados.refresh_token)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc))
