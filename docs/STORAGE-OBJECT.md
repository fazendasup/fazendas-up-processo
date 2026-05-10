# Ficheiros e object storage

- O servidor usa `server/storage.ts` para uploads via API de storage (não grava blobs permanentes no disco do container por defeito).
- O body HTTP aceita payloads grandes para JSON; anexos pesados devem ir para **S3 / R2 / GCS** com URL assinada, não para `fs` local em produção.
- Em SaaS: bucket por ambiente; políticas IAM mínimas; evitar nomes de objeto previsíveis com dados sensíveis.
