#!/usr/bin/env bash
# Faz deploy de produção pra Vercel (precisa de `vercel login` antes).
set -e
echo "==> Deploy de produção na Vercel"
npx vercel --prod
echo "==> Pronto! Acesse pelo celular usando a URL .vercel.app gerada acima."
