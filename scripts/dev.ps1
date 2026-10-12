Set-Location "$PSScriptRoot\..\backend"
npm install
npm run prisma:generate
npm run prisma:push
npm run seed

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\..\backend'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\..\frontend'; npm install; npm run dev"
