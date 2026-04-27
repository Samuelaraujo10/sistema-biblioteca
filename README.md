# Sistema de Biblioteca Escolar (Node.js)

Projeto fullstack para gerenciamento de livros de escola usando Node.js.

## Tecnologias

- Node.js
- Express
- EJS (frontend renderizado no servidor)
- SQLite

## Funcionalidades

- Cadastro e exclusão de livros
- Cadastro e exclusão de alunos
- Registro de empréstimos
- Marcação de devolução
- Dashboard com totais

## Arquitetura MVC

O projeto foi organizado em camadas:

- `src/config`: conexão e inicialização do banco
- `src/models`: acesso a dados e queries SQL
- `src/controllers`: regras de negócio e fluxo das requisições
- `src/routes`: definição das rotas HTTP
- `src/middlewares`: middlewares globais (ex.: tratamento de erro)
- `src/app.js`: configuração da aplicação Express
- `src/server.js`: ponto de entrada do servidor

## Como executar

1. Instale dependências:
   - `npm install`
2. Configure variáveis de ambiente:
   - copie `.env.example` para `.env`
3. Rode em desenvolvimento:
   - `npm run dev`
4. Acesse:
   - `http://localhost:3000`

## Produção

- O banco local é armazenado no arquivo `database.sqlite`
- O sistema cria backup automático diário em `backups/`
- O projeto mantém os 30 backups mais recentes automaticamente
- Recomenda-se sincronizar a pasta do projeto com OneDrive/Google Drive
- Defina `NODE_ENV=production`
- Inicie com `npm start`
- O schema das tabelas é criado automaticamente ao iniciar a aplicação
