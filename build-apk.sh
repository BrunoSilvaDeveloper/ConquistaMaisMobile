#!/bin/bash

echo "🚀 Script para gerar APK do ConquistaMais"
echo "=========================================="

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Execute este script no diretório raiz do projeto React Native"
    exit 1
fi

# Verificar se Java está instalado
if ! command -v java &> /dev/null; then
    echo "❌ Java não encontrado. Instale OpenJDK 17:"
    echo "   sudo apt install openjdk-17-jdk"
    echo "   export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64"
    exit 1
fi

# Verificar se Android SDK está configurado
if [ -z "$ANDROID_HOME" ]; then
    echo "⚠️  ANDROID_HOME não está definido. Tentando detectar automaticamente..."

    # Locais comuns do Android SDK
    POSSIBLE_PATHS=(
        "$HOME/Android/Sdk"
        "$HOME/Library/Android/sdk"
        "/opt/android-sdk"
        "/usr/lib/android-sdk"
    )

    for path in "${POSSIBLE_PATHS[@]}"; do
        if [ -d "$path" ]; then
            export ANDROID_HOME="$path"
            echo "✅ Android SDK encontrado em: $ANDROID_HOME"
            break
        fi
    done

    if [ -z "$ANDROID_HOME" ]; then
        echo "❌ Android SDK não encontrado. Instale e configure ANDROID_HOME"
        exit 1
    fi
fi

# Configurar PATH
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools

echo "📦 Limpando builds anteriores..."
rm -rf node_modules/.cache
rm -rf android/app/build
rm -rf android/.gradle

echo "📦 Instalando dependências..."
npm install

echo "🔧 Configurando permissões..."
chmod +x android/gradlew

echo "🛠️  Iniciando build do APK..."
cd android

# Limpar gradle
./gradlew clean

echo "📱 Gerando APK Debug..."
./gradlew assembleDebug --no-daemon --stacktrace

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 APK gerado com sucesso!"
    echo "📍 Localização: android/app/build/outputs/apk/debug/app-debug.apk"
    echo ""
    echo "📱 Para instalar no dispositivo:"
    echo "   adb install android/app/build/outputs/apk/debug/app-debug.apk"
    echo ""
    echo "📋 Ou copie o arquivo app-debug.apk para o celular e instale manualmente"

    # Verificar se APK existe e mostrar informações
    APK_FILE="app/build/outputs/apk/debug/app-debug.apk"
    if [ -f "$APK_FILE" ]; then
        APK_SIZE=$(du -h "$APK_FILE" | cut -f1)
        echo "📊 Tamanho do APK: $APK_SIZE"

        # Copiar APK para diretório raiz para facilitar acesso
        cp "$APK_FILE" "../ConquistaMais-debug.apk"
        echo "📁 APK copiado para: ConquistaMais-debug.apk (na raiz do projeto)"
    fi
else
    echo "❌ Falha ao gerar APK. Verifique os logs acima."
    exit 1
fi