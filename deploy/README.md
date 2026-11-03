# Deploy de teste no GCP (VM grátis)

Uma VM e2-micro do plano Always Free roda a API, o front e o HTTPS (Caddy) com Docker. O banco
SQLite e os arquivos enviados ficam num volume do Docker, no disco da VM: sobrevivem a reinício
e a novo deploy.

Só para testes: o usuário é o de dev (`X-Usuario-Id`), então todo mundo que abre o link vê os
mesmos dados. Não envie receita real.

## 1. Criar a VM (uma vez)

No [console do GCP](https://console.cloud.google.com):

1. Crie um projeto e ative o faturamento (pede cartão; a e2-micro fica no gratuito).
2. **Faturamento → Orçamentos e alertas**: crie um orçamento de R$ 1 com alerta por e-mail.
3. **Compute Engine → Instâncias de VM → Criar instância**:
   - Região: `us-central1`, `us-east1` ou `us-west1` (só essas entram no gratuito)
   - Tipo de máquina: `e2-micro`
   - Disco de inicialização: Ubuntu 24.04 LTS, **Disco permanente padrão**, 30 GB
   - Firewall: marque **Permitir tráfego HTTP** e **Permitir tráfego HTTPS**
4. **Rede VPC → Endereços IP**: promova o IP externo da VM para **estático** (assim o link não muda).

## 2. Instalar (uma vez)

Na lista de VMs, clique em **SSH** e rode:

```bash
# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker

# 2 GB de swap: a e2-micro tem 1 GB de RAM e o build do front precisa de mais
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Projeto (repositório privado: use um token do GitHub como senha)
git clone https://github.com/luan-sousaa/SafePass.git && cd SafePass/deploy
cp .env.example .env && nano .env   # GOOGLE_API_KEY e DOMINIO=<ip-com-traços>.sslip.io
docker compose up -d --build
```

O primeiro build leva alguns minutos. Depois, abra `https://<ip-com-traços>.sslip.io`.

## Atualizar

```bash
cd ~/SafePass && git pull && cd deploy && docker compose up -d --build
```

## Outros comandos

| Para | Comando (em `~/SafePass/deploy`) |
|---|---|
| Ver logs | `docker compose logs -f api` |
| Backup do banco e dos arquivos | `docker compose cp api:/data ./backup` |
| Zerar os dados | `docker compose down && docker volume rm deploy_dados && docker compose up -d` |

## Senha na entrada (opcional)

Para fechar o link com uma senha única, gere o hash com
`docker compose exec web caddy hash-password` e coloque dentro do bloco do `Caddyfile`:

```
basic_auth {
	mentor <hash>
}
```
