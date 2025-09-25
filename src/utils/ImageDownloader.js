import { Logger } from './Logger';

class ImageDownloader {
  constructor() {
    this.downloadTimeout = 10000; // 10 segundos timeout para cada imagem
  }

  /**
   * Faz download de uma imagem e converte para base64
   */
  async downloadImageAsBase64(imageUrl) {
    if (!imageUrl) return null;

    try {
      Logger.info(`📷 Baixando imagem: ${imageUrl}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.downloadTimeout);

      const response = await fetch(imageUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'image/*',
          'User-Agent': 'ConquistaMaisApp/1.0'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Verificar se é realmente uma imagem
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.startsWith('image/')) {
        throw new Error(`Tipo de conteúdo inválido: ${contentType}`);
      }

      // Converter para base64
      const blob = await response.blob();
      const base64 = await this.blobToBase64(blob);

      Logger.info(`✅ Imagem baixada com sucesso: ${imageUrl.substring(0, 50)}...`);
      return base64;

    } catch (error) {
      if (error.name === 'AbortError') {
        Logger.error(`⏱️  Timeout ao baixar imagem: ${imageUrl}`);
      } else {
        Logger.error(`❌ Erro ao baixar imagem ${imageUrl}:`, error);
      }
      return null;
    }
  }

  /**
   * Converte blob para base64
   */
  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Remove o prefixo "data:image/...;base64,"
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Baixa múltiplas imagens em paralelo (com limite de concorrência baixo)
   */
  async downloadMultipleImages(imageUrls, maxImages = 5) {
    if (!imageUrls || imageUrls.length === 0) return [];

    const results = [];
    const uniqueUrls = [...new Set(imageUrls.filter(url => url))]; // Remove duplicatas e URLs vazias

    // Limitar número máximo de imagens por sincronização para não sobrecarregar
    const limitedUrls = uniqueUrls.slice(0, maxImages);

    Logger.info(`📷 Baixando ${limitedUrls.length} imagens (${uniqueUrls.length > maxImages ? 'limitado de ' + uniqueUrls.length : 'total'}) uma por vez`);

    // Processar uma por vez para não sobrecarregar
    for (let i = 0; i < limitedUrls.length; i++) {
      const url = limitedUrls[i];
      const base64 = await this.downloadImageAsBase64(url);
      results.push({ url, base64, originalIndex: i });

      // Delay maior entre imagens para não fazer muitas requisições
      if (i < limitedUrls.length - 1) {
        await this.delay(2000); // 2 segundos entre imagens
      }
    }

    const successCount = results.filter(r => r.base64).length;
    Logger.info(`📷 Download completo: ${successCount}/${limitedUrls.length} imagens baixadas com sucesso`);

    return results;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new ImageDownloader();