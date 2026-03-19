# Gancho IA — Gerador de Ganchos de Vídeo

Sobe 1 vídeo → recebe 6 vídeos prontos (3 ganchos × Stories 9:16 + Feed 3:4)

## Como funciona
1. Você faz upload do vídeo
2. O Groq (Whisper) transcreve o áudio com timestamps
3. O Claude analisa e escolhe os 3 melhores trechos para gancho
4. O FFmpeg remonta 6 vídeos: cada gancho colado no início + 2 formatos

## Deploy no Railway

### 1. Criar conta no Railway
- Acesse railway.app e crie conta com GitHub

### 2. Criar projeto
- Novo projeto → Deploy from GitHub repo
- Selecione o repositório deste projeto

### 3. Variáveis de ambiente (obrigatório)
No Railway, vá em Variables e adicione:
```
GROQ_API_KEY=sua_key_aqui
ANTHROPIC_API_KEY=sua_key_aqui
```

### 4. Obter a Groq API Key (gratuita)
- Acesse console.groq.com
- Crie conta gratuita
- API Keys → Create API Key
- Cole no Railway

### 5. Obter a Anthropic API Key
- Acesse console.anthropic.com
- API Keys → Create Key
- Cole no Railway

## Rodando local (para testar)
```bash
pip install -r requirements.txt
export GROQ_API_KEY=sua_key
export ANTHROPIC_API_KEY=sua_key
uvicorn main:app --reload
```
Acesse: http://localhost:8000
