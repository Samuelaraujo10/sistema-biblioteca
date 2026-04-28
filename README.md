# 📚 Sistema Único de Biblioteca

O **Sistema Único de Biblioteca** é uma aplicação web moderna, desenvolvida para simplificar a gestão do acervo, locatários e empréstimos de uma biblioteca escolar ou institucional. Com uma interface polida, suporte a modo escuro e processos ágeis, o sistema atende tanto ao gerenciamento de alunos quanto da equipe escolar.

---

## 🎯 Objetivos do Projeto

O **Sistema Único de Biblioteca** foi criado com os seguintes objetivos principais em mente:
- **Centralização da Informação:** Reunir em um só lugar os dados do acervo de livros e dos usuários da escola, reduzindo o uso de papel, planilhas descentralizadas e fichas de controle manual.
- **Prevenção de Perdas:** Criar um controle firme de entradas e saídas de exemplares, rastreando exatamente com quem e há quanto tempo está cada livro, minimizando os extravios de patrimônio da biblioteca.
- **Agilidade no Atendimento:** Com a interface intuitiva de "Um Clique", a leitura inteligente e menus agrupados, a ideia é que os empréstimos sejam feitos em questão de segundos, evitando filas no balcão.
- **Comunicação Ativa:** Através das notificações e do painel de alertas do Dashboard atrelados a botões nativos do WhatsApp, a biblioteca passa a ter uma postura proativa nas cobranças amigáveis de devolução, diminuindo atrasos crônicos.

---

## 🚀 Tecnologias Utilizadas

- **Backend**: Node.js com Express.js
- **Banco de Dados**: SQLite3 (Leve, em arquivo local, fácil de realizar backups)
- **Frontend / Visualização**: EJS (Embedded JavaScript templates), HTML5, CSS3 Global Modularizado (sem dependências pesadas de framework de CSS).
- **Controle de Versão**: Git & GitHub

---

## ✨ Principais Features

### 1. 📊 Dashboard Inteligente (Início)
- Visão geral com cartões métricos (Total de Livros, Alunos, Funcionários e Empréstimos Ativos).
- **Alertas Automáticos**:
  - ⚠️ Empréstimos atrasados (Overdue).
  - ⏰ Alertas de devoluções próximas ao vencimento.
- Todos os alertas detalham quem está com o livro (Aluno ou Funcionário) e mostram botões diretos para contato via WhatsApp.

### 2. 📖 Gestão de Acervo (Livros)
- Cadastro de novos livros através de formulários expansíveis e animados.
- Campos principais: Título, Subtítulo, Autor, Editora, ISBN (útil para buscar capas) e Quantidade em estoque.
- Controle em tempo real das "Cópias Disponíveis" e "Cópias Emprestadas".
- **Importação/Exportação Avançada**: Importe lotes inteiros de livros a partir de um arquivo CSV, ferramenta de Diagnóstico para verificação prévia de erros e capacidade de exportar a lista atual.

### 3. 👥 Gestão de Alunos
- Cadastro padronizado da comunidade estudantil.
- Campos como: Nome Completo, Turma (1ª, 2ª, 3ª série), Turno (Matutino/Vespertino), Matrícula Escolar (12 dígitos numéricos) e Telefone/WhatsApp.
- Barra de busca dinâmica e integração no clique do telefone para abrir uma conversa via *WhatsApp Web* (`wa.me`).

### 4. 👔 Gestão de Professores e Funcionários (Staff)
- Módulo separado e unificado para a gestão dos colaboradores da escola que também consomem o acervo da biblioteca.
- Campos exigidos: Nome Completo, CPF, Tipo do cargo ("Professor" ou "Funcionário") e Telefone/WhatsApp.
- Identificação visual diferenciada nas listagens entre o que é aluno e o que é funcionário.

### 5. 📋 Controle de Empréstimos Unificado
- Registro ágil de novos empréstimos com menus (drop-down) agrupando e diferenciando alunos de funcionários na hora de selecionar o locatário.
- Verificação automática da disponibilidade de exemplares do livro selecionado.
- Prazos automáticos (ex: empréstimo padrão para 14 dias).
- Ações rápidas na tabela:
  - **Devolver** (Retorna o livro ao acervo na hora).
  - **Renovar** (Adiciona automaticamente +7 dias ao prazo, apenas disponível se não estiver vencido).

### 6. ⚙️ Interface e Experiência de Uso (UX/UI)
- **Padrão Visual Sólido**: O sistema conta com padrões unificados em todas as telas (botões no topo, caixa de busca e formulários em "cards colapsáveis" que deslizam suavemente).
- **Modo Escuro (Dark Mode)**: Suporte a alternância de temas via CSS Variables.
- **Responsividade**: Interface com boa adaptação para uso em telas menores.

### 7. 🛡️ Segurança e Backups
- **Login e Autenticação**: Proteção de rotas para garantir que as operações de CRUD da biblioteca sejam feitas apenas pelo gestor autorizado.
- **Sistema de Backups Nativos**: Ferramenta na barra de navegação principal que com apenas 1 clique gera e faz o download de um arquivo espelho limpo e atualizado de toda a base de dados em `.sqlite`.

---

## 🛠️ Como Executar o Projeto Localmente

1. **Pré-requisitos**:
   Certifique-se de ter o [Node.js](https://nodejs.org/) instalado em seu computador.

2. **Instalação das dependências**:
   Abra o terminal na pasta raiz do projeto e execute:
   ```bash
   npm install
   ```

3. **Configuração de Ambiente**:
   Crie um arquivo `.env` baseado no arquivo `.env.example` existente na raiz do projeto e ajuste as variáveis como a porta e informações de login.

4. **Rodando o Servidor de Desenvolvimento**:
   Para iniciar o sistema (com reinicialização automática a cada salvamento), rode:
   ```bash
   npm run dev
   ```

5. **Acesso**:
   Abra o seu navegador de preferência e digite:
   `http://localhost:3000` (ou a porta que você estipulou no .env).

---

## 📂 Estrutura de Diretórios Básica
- `/src/config`: Conexões e iniciação da base SQLite.
- `/src/models`: Interação direta (Queries) com a Base de Dados (Books, Students, Staff, Loans).
- `/src/controllers`: Regras de negócio, contagens e envio de dados para as views.
- `/src/routes`: Definição de endpoints HTTP.
- `/views`: A interface gráfica de fato, arquivos EJS estruturados e componentizados.
- `/public`: (Arquivos CSS e outros assets estáticos do frontend).

---
*Documento gerado automaticamente para o controle e manutenção do Sistema Único de Biblioteca.*
