import { useState, useEffect, useCallback, useRef } from 'react';

interface MediaItem {
  id: number;
  url: string;
  filename: string;
  width: number;
  height: number;
}

interface ImagePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

export default function ImagePicker({ isOpen, onClose, onSelect }: ImagePickerProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<'library' | 'url'>('library');
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  // Fetch media on open
  useEffect(() => {
    if (isOpen) {
      fetchMedia();
      setSelected(null);
      setUrlInput('');
    }
  }, [isOpen]);

  async function fetchMedia() {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/media');
      if (res.ok) {
        const data = await res.json();
        setMedia(Array.isArray(data) ? data : []);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.error || '미디어 목록을 불러올 수 없습니다.');
      }
    } catch (e: any) {
      setErrorMsg('서버에 연결할 수 없습니다. 네트워크를 확인하세요.');
    }
    setLoading(false);
  }

  // 1MB 초과 이미지를 자동 압축 — 반드시 1MB 이하로 만듦
  async function compressImage(file: File, maxBytes: number = 1 * 1024 * 1024): Promise<File> {
    if (file.size <= maxBytes) return file;

    // SVG는 압축 불가 — 그대로 반환
    if (file.type === 'image/svg+xml') return file;

    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const url = URL.createObjectURL(file);
      img.onload = async () => {
        URL.revokeObjectURL(url);

        let { naturalWidth: width, naturalHeight: height } = img;
        const isPng = file.type === 'image/png';

        // 용량 비례로 초기 리사이즈 — 파일이 클수록 더 줄임
        const sizeRatio = file.size / maxBytes;
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
        const ctx = canvas.getContext('2d')!;

        if (!isPng) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(img, 0, 0, width, height);

        const toBlob = (type: string, q?: number): Promise<Blob> =>
          new Promise((r) => canvas.toBlob((b) => r(b!), type, q));

        if (isPng) {
          let blob = await toBlob('image/png');
          // PNG가 여전히 크면 해상도를 줄임
          if (blob.size > maxBytes) {
            const scale = Math.sqrt(maxBytes / blob.size) * 0.85;
            canvas.width = Math.round(width * scale);
            canvas.height = Math.round(height * scale);
            const ctx2 = canvas.getContext('2d')!;
            ctx2.clearRect(0, 0, canvas.width, canvas.height);
            ctx2.drawImage(img, 0, 0, canvas.width, canvas.height);
            blob = await toBlob('image/png');
          }
          // 그래도 크면 JPEG로 전환
          if (blob.size > maxBytes) {
            const ctx3 = canvas.getContext('2d')!;
            ctx3.fillStyle = '#ffffff';
            ctx3.fillRect(0, 0, canvas.width, canvas.height);
            ctx3.drawImage(img, 0, 0, canvas.width, canvas.height);
            blob = await toBlob('image/jpeg', 0.7);
          }
          const compressed = new File([blob], file.name, { type: blob.type, lastModified: Date.now() });
          console.log(`[압축] ${file.name}: ${(file.size/1024/1024).toFixed(1)}MB → ${(compressed.size/1024/1024).toFixed(1)}MB`);
          resolve(compressed);
        } else {
          // JPEG: quality를 단계적으로 낮춰서 1MB 이하 찾기
          let quality = 0.8;
          let blob = await toBlob('image/jpeg', quality);

          while (blob.size > maxBytes && quality > 0.2) {
            quality -= 0.05;
            blob = await toBlob('image/jpeg', quality);
          }

          // 그래도 크면 해상도를 더 줄임
          if (blob.size > maxBytes) {
            const scale = Math.sqrt(maxBytes / blob.size) * 0.85;
            canvas.width = Math.round(width * scale);
            canvas.height = Math.round(height * scale);
            const ctx2 = canvas.getContext('2d')!;
            ctx2.fillStyle = '#ffffff';
            ctx2.fillRect(0, 0, canvas.width, canvas.height);
            ctx2.drawImage(img, 0, 0, canvas.width, canvas.height);
            blob = await toBlob('image/jpeg', 0.6);
          }

          // 최종 안전장치 — 아직도 크면 더 줄임
          while (blob.size > maxBytes) {
            canvas.width = Math.round(canvas.width * 0.75);
            canvas.height = Math.round(canvas.height * 0.75);
            const ctx3 = canvas.getContext('2d')!;
            ctx3.fillStyle = '#ffffff';
            ctx3.fillRect(0, 0, canvas.width, canvas.height);
            ctx3.drawImage(img, 0, 0, canvas.width, canvas.height);
            blob = await toBlob('image/jpeg', 0.5);
          }

          const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          console.log(`[압축] ${file.name}: ${(file.size/1024/1024).toFixed(1)}MB → ${(compressed.size/1024/1024).toFixed(1)}MB (q=${quality.toFixed(2)})`);
          resolve(compressed);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };
      img.src = url;
    });
  }

  async function handleUpload(files: FileList | File[]) {
    setUploading(true);
    setErrorMsg('');
    const fileArr = Array.from(files);
    const total = fileArr.length;
    let uploaded = 0;
    const errors: string[] = [];

    for (let i = 0; i < fileArr.length; i++) {
      let file = fileArr[i];

      // 이미지 파일 검증
      if (!file.type.startsWith('image/')) {
        errors.push(`${file.name}: 이미지 파일이 아닙니다.`);
        continue;
      }

      // 1MB 초과 시 자동 압축
      if (file.size > 1 * 1024 * 1024) {
        const origSize = (file.size / 1024 / 1024).toFixed(1);
        setUploadProgress(`압축 중... ${file.name} (${origSize}MB)`);
        try {
          file = await compressImage(file);
        } catch {
          errors.push(`${file.name}: 압축 실패`);
          continue;
        }
      }

      setUploadProgress(`업로드 중... (${i + 1}/${total})`);
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/media/upload', { method: 'POST', body: formData });
        if (res.ok) {
          uploaded++;
        } else {
          const err = await res.json().catch(() => ({ error: '알 수 없는 오류' }));
          errors.push(`${file.name}: ${err.error}`);
        }
      } catch (e: any) {
        errors.push(`${file.name}: 네트워크 오류`);
      }
    }

    if (errors.length > 0) {
      setErrorMsg(errors.join('\n'));
      setUploadProgress(`${uploaded}/${total}개 완료 (${errors.length}개 실패)`);
    } else {
      setUploadProgress(`${uploaded}/${total}개 완료`);
    }

    setUploading(false);
    await fetchMedia();
    setTimeout(() => setUploadProgress(''), 3000);
  }

  // Drag and drop
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    if (e.dataTransfer?.files.length) {
      handleUpload(e.dataTransfer.files);
    }
  }, []);

  function handleSelectAndInsert() {
    if (tab === 'url' && urlInput.trim()) {
      onSelect(urlInput.trim());
      onClose();
    } else if (tab === 'library' && selected) {
      onSelect(selected);
      onClose();
    }
  }

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '90%',
          maxWidth: 800,
          maxHeight: '85vh',
          backgroundColor: '#ffffff',
          borderRadius: 12,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #e8e8ed',
          }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1d1d1f', margin: 0 }}>
            이미지 선택
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6e6e73',
              padding: 4,
              display: 'flex',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e8e8ed' }}>
          <button
            type="button"
            onClick={() => setTab('library')}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: 'none',
              border: 'none',
              borderBottom: tab === 'library' ? '2px solid #D4AA45' : '2px solid transparent',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.875rem',
              fontWeight: tab === 'library' ? 600 : 400,
              color: tab === 'library' ? '#1d1d1f' : '#6e6e73',
            }}
          >
            미디어 라이브러리
          </button>
          <button
            type="button"
            onClick={() => setTab('url')}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: 'none',
              border: 'none',
              borderBottom: tab === 'url' ? '2px solid #D4AA45' : '2px solid transparent',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.875rem',
              fontWeight: tab === 'url' ? 600 : 400,
              color: tab === 'url' ? '#1d1d1f' : '#6e6e73',
            }}
          >
            URL 직접 입력
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20, position: 'relative' }}>
          {/* Drag overlay */}
          {isDragging && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(212, 170, 69, 0.1)',
                border: '3px dashed #D4AA45',
                borderRadius: 8,
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D4AA45" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <p style={{ marginTop: 8, fontSize: '0.875rem', fontWeight: 600, color: '#D4AA45' }}>
                  이미지를 놓으세요
                </p>
              </div>
            </div>
          )}

          {tab === 'library' && (
            <>
              {/* Upload button */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    backgroundColor: '#1d1d1f',
                    color: '#ffffff',
                    borderRadius: 6,
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  업로드
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files?.length) handleUpload(e.target.files);
                    }}
                  />
                </label>
                {uploadProgress && (
                  <span style={{ fontSize: '0.8125rem', color: '#D4AA45' }}>
                    {uploadProgress}
                  </span>
                )}
                {uploading && (
                  <span style={{ fontSize: '0.8125rem', color: '#6e6e73' }}>처리 중...</span>
                )}
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div
                  style={{
                    padding: '10px 14px',
                    marginBottom: 12,
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: 6,
                    fontSize: '0.8125rem',
                    color: '#DC2626',
                    whiteSpace: 'pre-line',
                    display: 'flex',
                    gap: 8,
                    alignItems: 'flex-start',
                  }}
                >
                  <span style={{ flexShrink: 0 }}>⚠️</span>
                  <span>{errorMsg}</span>
                  <button
                    type="button"
                    onClick={() => setErrorMsg('')}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', fontWeight: 700, flexShrink: 0 }}
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Media Grid */}
              {loading ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: '#8c8c8c' }}>
                  불러오는 중...
                </div>
              ) : media.length === 0 ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: '#8c8c8c' }}>
                  <p style={{ fontSize: '0.875rem' }}>업로드된 이미지가 없습니다</p>
                  <p style={{ fontSize: '0.8125rem', marginTop: 4, color: '#aaa' }}>
                    이미지를 드래그하거나 업로드 버튼을 클릭하세요
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                    gap: 10,
                  }}
                >
                  {media.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelected(item.url)}
                      style={{
                        position: 'relative',
                        aspectRatio: '1',
                        borderRadius: 8,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: selected === item.url ? '3px solid #D4AA45' : '2px solid transparent',
                        boxShadow: selected === item.url ? '0 0 0 2px rgba(212, 170, 69, 0.3)' : 'none',
                        transition: 'all 0.15s',
                      }}
                    >
                      <img
                        src={item.url}
                        alt={item.filename}
                        loading="lazy"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          backgroundColor: '#f5f5f7',
                        }}
                      />
                      {selected === item.url && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            backgroundColor: '#D4AA45',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'url' && (
            <div style={{ maxWidth: 500 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: '#6e6e73',
                  marginBottom: 6,
                }}
              >
                이미지 URL
              </label>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/image.jpg"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: '1px solid #e8e8ed',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                  color: '#1d1d1f',
                  outline: 'none',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#D4AA45')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#e8e8ed')}
              />
              {urlInput && (
                <div style={{ marginTop: 16 }}>
                  <p style={{ fontSize: '0.75rem', color: '#6e6e73', marginBottom: 8 }}>미리보기</p>
                  <img
                    src={urlInput}
                    alt="미리보기"
                    style={{
                      maxWidth: '100%',
                      maxHeight: 200,
                      borderRadius: 6,
                      backgroundColor: '#f5f5f7',
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                    onLoad={(e) => {
                      (e.target as HTMLImageElement).style.display = 'block';
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            padding: '12px 20px',
            borderTop: '1px solid #e8e8ed',
            backgroundColor: '#fafafa',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid #e8e8ed',
              backgroundColor: '#ffffff',
              color: '#6e6e73',
              fontSize: '0.8125rem',
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSelectAndInsert}
            disabled={
              (tab === 'library' && !selected) ||
              (tab === 'url' && !urlInput.trim())
            }
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: 'none',
              backgroundColor:
                (tab === 'library' && selected) || (tab === 'url' && urlInput.trim())
                  ? '#1d1d1f'
                  : '#d2d2d7',
              color: '#ffffff',
              fontSize: '0.8125rem',
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor:
                (tab === 'library' && selected) || (tab === 'url' && urlInput.trim())
                  ? 'pointer'
                  : 'not-allowed',
            }}
          >
            선택
          </button>
        </div>
      </div>
    </div>
  );
}
