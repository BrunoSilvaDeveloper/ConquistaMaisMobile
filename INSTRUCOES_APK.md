# 📱 **Instruções para Gerar APK do ConquistaMais**

## 🎯 **O que foi configurado:**

### ✅ **Configurações de Rede:**
- **network_security_config.xml** criado para permitir HTTPS/HTTP
- **AndroidManifest.xml** atualizado com permissões necessárias
- **Domínio conquistamais.zunostudio.com.br** liberado
- **Clear text traffic** habilitado para desenvolvimento

### ✅ **Permissões adicionadas:**
- `INTERNET` - Para requisições HTTP/HTTPS
- `ACCESS_NETWORK_STATE` - Para verificar conectividade
- `ACCESS_WIFI_STATE` - Para detectar tipo de rede
- `WAKE_LOCK` - Para manter sync em background

## 🚀 **Como Gerar o APK:**

### **Opção 1: Script Automático (Recomendado)**
```bash
# Execute no diretório do projeto:
./build-apk.sh
```

### **Opção 2: Manual**
```bash
# 1. Instalar dependências
npm install

# 2. Limpar builds anteriores
cd android
./gradlew clean

# 3. Gerar APK Debug
./gradlew assembleDebug
```

## 📋 **Pré-requisitos:**

### **1. Java Development Kit (JDK)**
```bash
# Ubuntu/Debian:
sudo apt install openjdk-17-jdk

# Configurar JAVA_HOME:
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
```

### **2. Android SDK**
- Baixar Android Studio ou apenas o SDK
- Configurar `ANDROID_HOME`:
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

### **3. Verificar instalação:**
```bash
java -version
adb version
```

## 📁 **Localização do APK:**

Após o build bem-sucedido, o APK estará em:
- **Pasta original**: `android/app/build/outputs/apk/debug/app-debug.apk`
- **Cópia na raiz**: `ConquistaMais-debug.apk` (criada automaticamente)

## 📱 **Instalar no Celular:**

### **Via ADB:**
```bash
adb install ConquistaMais-debug.apk
```

### **Via Transferência:**
1. Copie `ConquistaMais-debug.apk` para o celular
2. Abra o arquivo no celular
3. Permita "Instalar de fontes desconhecidas" se solicitado
4. Instale normalmente

## 🔍 **Diferenças do APK Configurado:**

### **❌ Antes (Não funcionava):**
- Sem configuração de network security
- HTTPS bloqueado para domínios customizados
- Permissões de rede limitadas
- Clear text traffic desabilitado

### **✅ Agora (Deve funcionar):**
- Network security liberado para conquistamais.zunostudio.com.br
- HTTPS/HTTP permitidos
- Permissões completas de rede
- Configuração otimizada para produção

## 🐛 **Se o APK ainda não funcionar:**

### **1. Verificar logs do dispositivo:**
```bash
adb logcat | grep -i "conquistamais\|react\|network"
```

### **2. Testar conectividade:**
- Use o sistema de debug implementado no app
- Botão "📊 Status & Conectividade" na tela offline
- Executar "🔍 Debug Completo"

### **3. Verificar certificados:**
- O servidor pode ter certificado SSL inválido/expirado
- Testar manualmente: `curl https://conquistamais.zunostudio.com.br`

### **4. Build Release (se debug funcionar):**
```bash
cd android
./gradlew assembleRelease
```

## 🎯 **Próximos Passos:**

1. **Gerar APK** com o script fornecido
2. **Instalar** no dispositivo real
3. **Testar** sincronização usando o debug
4. **Analisar logs** se ainda houver problemas
5. **Ajustar configurações** conforme necessário

---

**🔧 Este APK foi configurado especificamente para resolver problemas de rede que impediam a sincronização no dispositivo real.**