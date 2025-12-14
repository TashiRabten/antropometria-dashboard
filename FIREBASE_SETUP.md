# Guia de Configuração do Firebase - Lab Management System

## ✅ Código Implementado

Todos os arquivos Firebase foram criados e configurados:
- ✅ `firebase-config.js` - Configuração e inicialização
- ✅ `firebase-auth.js` - Autenticação
- ✅ `firebase-storage.js` - Upload de arquivos
- ✅ `firebase-db.js` - Operações do Firestore
- ✅ `labs-upload.js` - Atualizado para Firebase
- ✅ `labs-parser.js` - Atualizado para Firestore
- ✅ `labs.html` - Scripts Firebase adicionados

## 📋 Próximos Passos (Manual)

### **Passo 1: Criar Projeto Firebase**

1. Acesse: https://console.firebase.google.com
2. Clique em **"Adicionar projeto"** (ou "Add project")
3. Nome do projeto: `antropometria-dashboard`
4. Google Analytics: **Desabilitar** (não é necessário)
5. Clique em **"Criar projeto"**

### **Passo 2: Habilitar Serviços**

#### **A. Authentication (Autenticação)**
1. No menu lateral → **Authentication**
2. Clique em **"Get started"**
3. Aba **"Sign-in method"**
4. Ative **"Email/Password"**
5. **NÃO** ative "Email link (passwordless sign-in)"
6. Salvar

#### **B. Firestore Database**
1. No menu lateral → **Firestore Database**
2. Clique em **"Create database"**
3. Modo: **"Start in test mode"** (vamos configurar as regras depois)
4. Localização: **"us-central1"** (ou o mais próximo)
5. Criar

#### **C. Cloud Storage**
1. No menu lateral → **Storage**
2. Clique em **"Get started"**
3. Modo: **"Start in test mode"** (vamos configurar as regras depois)
4. Localização: **"us-central1"** (mesma do Firestore)
5. Concluir

### **Passo 3: Obter Credenciais do Firebase**

1. No topo esquerdo, clique no **ícone de engrenagem** ⚙️ → **"Project settings"**
2. Scroll down até **"Your apps"**
3. Clique no ícone **Web** (`</>`)
4. App nickname: `Lab Management`
5. **NÃO** marque "Also set up Firebase Hosting"
6. Clique em **"Register app"**
7. **COPIE** o código do `firebaseConfig` que aparece:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "antropometria-dashboard.firebaseapp.com",
  projectId: "antropometria-dashboard",
  storageBucket: "antropometria-dashboard.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

8. **Cole essas credenciais** no arquivo `firebase-config.js` substituindo os placeholders:

```javascript
// firebase-config.js
const firebaseConfig = {
    apiKey: "COLE_AQUI_O_SEU_API_KEY",
    authDomain: "COLE_AQUI_O_SEU_AUTH_DOMAIN",
    projectId: "COLE_AQUI_O_SEU_PROJECT_ID",
    storageBucket: "COLE_AQUI_O_SEU_STORAGE_BUCKET",
    messagingSenderId: "COLE_AQUI_O_SEU_MESSAGING_SENDER_ID",
    appId: "COLE_AQUI_O_SEU_APP_ID"
};
```

### **Passo 4: Configurar Security Rules**

#### **A. Firestore Rules**
1. No menu lateral → **Firestore Database**
2. Aba **"Rules"**
3. **Cole este código:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // User's labs
      match /labs/{labId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      // User's OCR cache
      match /ocrCache/{labId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

4. Clique em **"Publish"**

#### **B. Storage Rules**
1. No menu lateral → **Storage**
2. Aba **"Rules"**
3. **Cole este código:**

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /labs/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

4. Clique em **"Publish"**

### **Passo 5: Criar Primeiro Usuário**

1. Abra o site `labs.html` no navegador
2. Abra o **Console do navegador** (F12)
3. **Cole e execute este comando** (substitua os valores):

```javascript
firebaseAuth.createInitialUser(
  'julia@antropometria.com',  // Email
  'Turtle',                    // Senha
  'Julia Barichello'           // Nome de exibição
).then(() => console.log('✅ Usuário criado!'))
.catch(err => console.error('❌ Erro:', err));
```

4. Você verá no console:
```
✅ Usuário criado: julia@antropometria.com
👤 User ID: AbC123XyZ...
📝 Display Name: Julia Barichello
```

5. **Pronto!** Agora você pode fazer login normalmente

### **Passo 6: Teste de Login e Upload**

1. Recarregue a página `labs.html`
2. Login:
   - Usuário: `Julia Barichello` (ou `julia@antropometria.com`)
   - Senha: `Turtle`
3. Após login, você verá o dashboard principal
4. **Teste o upload:**
   - Arraste um arquivo PDF de exame para a área de upload
   - OU clique em "Selecionar Arquivos"
5. Acompanhe o progresso:
   - Upload → Cloud Storage
   - Processamento → Parsing
   - Salvando → Firestore
6. O exame deve aparecer na lista automaticamente!

### **Passo 7: Criar Usuários Adicionais (Opcional)**

Se quiser adicionar Natalia ou outros usuários:

```javascript
// Natalia
firebaseAuth.createInitialUser(
  'natalia@antropometria.com',
  'SenhaSegura123',
  'Natalia Medina'
);
```

---

## 🔍 Verificação

### **Verificar se está funcionando:**

1. **Authentication:**
   - Firebase Console → Authentication → Users
   - Deve aparecer: julia@antropometria.com

2. **Firestore:**
   - Firebase Console → Firestore Database
   - Após upload, deve aparecer:
     - `users/{userId}/labs/{labId}` com metadados

3. **Storage:**
   - Firebase Console → Storage
   - Após upload, deve aparecer:
     - `labs/{userId}/{labId}.pdf` (ou .jpg)

---

## 🎯 Benefícios Agora Ativos

✅ **Multi-device:** Acesse de qualquer navegador/dispositivo
✅ **Cloud backup:** Dados nunca são perdidos
✅ **Real-time sync:** Mudanças aparecem instantaneamente
✅ **Compartilhamento:** Múltiplos usuários podem acessar
✅ **Segurança:** Firebase Auth + Security Rules
✅ **5GB grátis:** Espaço para centenas de exames

---

## ❓ Troubleshooting

### **Erro: "Firebase: Error (auth/user-not-found)"**
- Solução: Criar o usuário com `createInitialUser()` no console

### **Erro: "Missing or insufficient permissions"**
- Solução: Verificar Security Rules do Firestore e Storage

### **Erro: "Network request failed"**
- Solução: Verificar conexão com internet

### **Arquivo não aparece após upload:**
- Verificar console do navegador para erros
- Verificar se usuário está autenticado
- Verificar Firebase Console → Storage para ver se arquivo foi enviado

---

## 📝 Notas Importantes

1. **Credenciais públicas:** Como é um site estático, as credenciais do Firebase ficam no código. Isso é **NORMAL** para Firebase - a segurança vem das Security Rules, não de esconder as credenciais.

2. **Custo:** Você vai ficar no **plano gratuito indefinidamente**. O uso estimado é:
   - 72 arquivos × 500KB = ~36MB (muito abaixo dos 5GB grátis)
   - ~200 leituras/dia (muito abaixo dos 50K grátis)

3. **Dados antigos:** Os exames que você tinha no IndexedDB **NÃO** foram migrados automaticamente. Você precisa fazer **upload novamente** dos 72 arquivos PDF/JPG.

4. **Backup:** Como os dados estão no Firebase, você pode acessar de qualquer lugar. Mas se quiser um backup local, pode usar a função `reprocessAllLabs()` que re-baixa tudo.

---

## ✅ Checklist Final

- [ ] Projeto Firebase criado
- [ ] Authentication habilitado (Email/Password)
- [ ] Firestore Database criado (test mode)
- [ ] Cloud Storage criado (test mode)
- [ ] Credenciais copiadas para `firebase-config.js`
- [ ] Security Rules configuradas (Firestore + Storage)
- [ ] Primeiro usuário criado (`julia@antropometria.com`)
- [ ] Login testado com sucesso
- [ ] Upload de arquivo testado
- [ ] Arquivo aparece na lista
- [ ] Dados visíveis no Firebase Console

---

**Pronto! O sistema Firebase está configurado e funcionando! 🎉**

Se tiver qualquer dúvida ou erro, me avise que eu ajudo a resolver!
