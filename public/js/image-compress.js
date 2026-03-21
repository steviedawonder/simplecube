/**
 * 브라우저에서 이미지 압축 (Canvas API)
 * 2MB 초과 시 자동으로 품질을 낮춰 2MB 이하로 만듦
 * @param {File} file - 원본 이미지 파일
 * @param {number} maxSizeBytes - 최대 파일 크기 (기본 2MB)
 * @returns {Promise<File>} - 압축된 파일
 */
async function compressImage(file, maxSizeBytes = 2 * 1024 * 1024) {
  // 2MB 이하면 그대로 반환
  if (file.size <= maxSizeBytes) return file;

  // 이미지가 아니면 그대로 반환
  if (!file.type.startsWith('image/')) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement('canvas');
      let width = img.naturalWidth;
      let height = img.naturalHeight;

      // 매우 큰 이미지는 해상도도 줄임 (4000px 이상)
      const MAX_DIM = 3000;
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      // PNG 투명 배경을 흰색으로 채움 (JPEG 변환 시 검정 방지)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // 점진적으로 품질을 낮추며 2MB 이하가 될 때까지 시도
      let quality = 0.85;
      let blob = null;

      while (quality >= 0.3) {
        blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality));
        if (blob.size <= maxSizeBytes) break;
        quality -= 0.1;
      }

      // 그래도 크면 해상도를 더 줄임
      if (blob.size > maxSizeBytes) {
        const scale = Math.sqrt(maxSizeBytes / blob.size) * 0.9;
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.7));
      }

      const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      console.log(`[압축] ${file.name}: ${(file.size / 1024 / 1024).toFixed(1)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(1)}MB (q=${quality.toFixed(1)})`);
      resolve(compressedFile);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // 실패 시 원본 반환
    };

    img.src = url;
  });
}

/**
 * 여러 파일을 한번에 압축
 * @param {File[]} files
 * @param {number} maxSizeBytes
 * @returns {Promise<File[]>}
 */
async function compressImages(files, maxSizeBytes = 2 * 1024 * 1024) {
  return Promise.all(files.map(f => compressImage(f, maxSizeBytes)));
}

// 전역 노출
window.compressImage = compressImage;
window.compressImages = compressImages;
