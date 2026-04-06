/**
 * 브라우저에서 이미지 압축 (Canvas API)
 * 1MB 초과 시 자동으로 해상도와 품질을 낮춰 1MB 이하로 만듦
 * @param {File} file - 원본 이미지 파일
 * @param {number} maxSizeBytes - 최대 파일 크기 (기본 1MB)
 * @returns {Promise<File>} - 압축된 파일
 */
async function compressImage(file, maxSizeBytes = 1 * 1024 * 1024) {
  // 1MB 이하면 그대로 반환
  if (file.size <= maxSizeBytes) return file;

  // 이미지가 아니면 그대로 반환
  if (!file.type.startsWith('image/')) return file;

  const isPng = file.type === 'image/png';

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(url);

      let width = img.naturalWidth;
      let height = img.naturalHeight;

      // 용량 비례로 초기 최대 해상도 결정 — 파일이 클수록 더 줄임
      const sizeRatio = file.size / maxSizeBytes;
      let maxDim = 1920;
      if (sizeRatio > 10) maxDim = 1024;
      else if (sizeRatio > 6) maxDim = 1200;
      else if (sizeRatio > 3) maxDim = 1600;

      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!isPng) {
        // JPEG 변환 시 검정 방지를 위해 흰색 배경
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
      }
      ctx.drawImage(img, 0, 0, width, height);

      const toBlob = (type, q) => new Promise((r) => canvas.toBlob(r, type, q));

      if (isPng) {
        // PNG는 투명도를 유지한 채 PNG로 출력
        let blob = await toBlob('image/png');

        // 그래도 크면 해상도를 줄임
        if (blob.size > maxSizeBytes) {
          const scale = Math.sqrt(maxSizeBytes / blob.size) * 0.85;
          canvas.width = Math.round(width * scale);
          canvas.height = Math.round(height * scale);
          const ctx2 = canvas.getContext('2d');
          ctx2.clearRect(0, 0, canvas.width, canvas.height);
          ctx2.drawImage(img, 0, 0, canvas.width, canvas.height);
          blob = await toBlob('image/png');
        }

        // 그래도 크면 JPEG로 전환
        if (blob.size > maxSizeBytes) {
          const ctx3 = canvas.getContext('2d');
          ctx3.fillStyle = '#ffffff';
          ctx3.fillRect(0, 0, canvas.width, canvas.height);
          ctx3.drawImage(img, 0, 0, canvas.width, canvas.height);
          blob = await toBlob('image/jpeg', 0.7);
        }

        const compressedFile = new File([blob], file.name, {
          type: blob.type,
          lastModified: Date.now(),
        });
        console.log(`[압축] ${file.name}: ${(file.size / 1024 / 1024).toFixed(1)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(1)}MB (PNG)`);
        resolve(compressedFile);
      } else {
        // JPEG 압축 — quality를 0.05 단위로 세밀하게 낮춤
        let quality = 0.8;
        let blob = await toBlob('image/jpeg', quality);

        while (blob.size > maxSizeBytes && quality > 0.2) {
          quality -= 0.05;
          blob = await toBlob('image/jpeg', quality);
        }

        // 그래도 크면 해상도를 더 줄임
        if (blob.size > maxSizeBytes) {
          const scale = Math.sqrt(maxSizeBytes / blob.size) * 0.85;
          canvas.width = Math.round(width * scale);
          canvas.height = Math.round(height * scale);
          const ctx2 = canvas.getContext('2d');
          ctx2.fillStyle = '#ffffff';
          ctx2.fillRect(0, 0, canvas.width, canvas.height);
          ctx2.drawImage(img, 0, 0, canvas.width, canvas.height);
          blob = await toBlob('image/jpeg', 0.6);
        }

        // 최종 안전장치 — 아직도 크면 75%씩 반복 축소
        while (blob.size > maxSizeBytes) {
          canvas.width = Math.round(canvas.width * 0.75);
          canvas.height = Math.round(canvas.height * 0.75);
          const ctx3 = canvas.getContext('2d');
          ctx3.fillStyle = '#ffffff';
          ctx3.fillRect(0, 0, canvas.width, canvas.height);
          ctx3.drawImage(img, 0, 0, canvas.width, canvas.height);
          blob = await toBlob('image/jpeg', 0.5);
        }

        const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        console.log(`[압축] ${file.name}: ${(file.size / 1024 / 1024).toFixed(1)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(1)}MB (q=${quality.toFixed(2)})`);
        resolve(compressedFile);
      }
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
async function compressImages(files, maxSizeBytes = 1 * 1024 * 1024) {
  return Promise.all(files.map(f => compressImage(f, maxSizeBytes)));
}

// 전역 노출
window.compressImage = compressImage;
window.compressImages = compressImages;
