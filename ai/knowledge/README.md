# knowledge/

Especificação de Capabilities de **camada 1 (conhecimento)** — a única
porta de entrada para `empresas/<slug>/`. Hoje contém só
`company-knowledge/`, ainda não implementada (ver
`company-knowledge/CAPABILITY.md` para o contrato completo).

Esta pasta guarda a **especificação** de como acessar conhecimento de
empresa — nunca os dados em si, que continuam vivendo em `empresas/`, fora
do Git.

Regra que vale para toda Capability aqui: nenhuma outra Capability (de
nenhuma camada) lê `empresas/**` diretamente — sempre passa por uma
Capability desta pasta. Ver `ai/architecture/ARQUITETURA.md`.
