@echo off
title Sistema Único de Biblioteca
color 0A

echo ========================================================
echo        SISTEMA UNICO DE BIBLIOTECA - INICIANDO
echo ========================================================
echo.
echo Ligando os motores, aguarde um segundo...

:: Inicia o servidor em segundo plano (na mesma janela, mas sem travar o restante do script)
start /b npm start

:: Espera 2 segundos para dar tempo do servidor carregar completamente
timeout /t 2 /nobreak > NUL

:: Abre o navegador padrao direto no link do sistema
start http://localhost:3000

echo.
echo ========================================================
echo TUDO PRONTO! O navegador ja deve ter aberto.
echo ========================================================
echo IMPORTANTE: Pode minimizar esta janela preta, mas NAO FECHE. 
echo Se voce fechar esta janela, o sistema saira do ar.
echo.

:: Mantem a janela aberta
pause
