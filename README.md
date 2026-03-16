# driveShare

Plataforma de partilha de boleias desenvolvida com **Node.js**, **Express**, **TypeScript** e **MongoDB**.
Permite aos utilizadores oferecer e encontrar boleias de forma simples, com autenticação via conta Google.

> **Nota:** Esta é uma versão base de teste — a aplicação corre apenas localmente e não está disponível em produção.

---

## Funcionalidades

- Autenticação com email/password ou conta Google (OAuth 2.0)
- Criação de boleias com destino, data e lugares disponíveis
- Listagem e pesquisa de boleias disponíveis
- Pedidos de reserva de boleia

## Stack

- **Backend:** Node.js, Express, TypeScript
- **Base de dados:** MongoDB
- **Autenticação:** JWT + Passport.js (Google OAuth 2.0)
- **Frontend:** HTML, CSS, JavaScript

---

## Screenshots

### Login

Ecrã de entrada na aplicação. O utilizador pode autenticar-se com email e password ou optar pela autenticação com Google.

<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/19dee24a-d358-48a2-aab4-2b4779ae5ac0" />

---

### Autenticação com Google

Fluxo de OAuth 2.0 do Google. O utilizador é redirecionado para a página de autorização da Google, onde seleciona a conta com que pretende entrar.

<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/85d2255f-059a-41c4-a5df-ef395f270b77" />

---

### Criar Boleia

Formulário para publicar uma nova boleia. O utilizador define a origem, destino, data, hora e número de lugares disponíveis.

<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/6f6fda69-dccd-434d-94be-a956618125ac" />

---

### Lista de Boleias

Vista geral das boleias disponíveis. Cada entrada mostra os detalhes da viagem, permitindo ao utilizador encontrar e pedir uma boleia.

<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/9839ec2b-0b14-407a-956d-dab01d605978" />

---

## Instalação

```bash
# Instalar dependências
npm install

# Iniciar o servidor
npm start
```

> Requer um ficheiro `.env` com as variáveis de ambiente (MongoDB URI, credenciais Google OAuth, JWT secret).
