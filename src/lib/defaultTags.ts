// 커스텀 범위 전용 태그 (포트폴리오 갤러리에서 제외)
export const POPUP_CUSTOM_TAGS = ['랩핑', 'UI커스텀', '백드롭백월', '인화지'];

export const POPUP_DEFAULT_TAGS = [
  '팝업부스', '모듈형', '우드Edge', '우드Round',  // 모델 태그
  ...POPUP_CUSTOM_TAGS,                          // 커스텀 태그
];

export const WEDDING_DEFAULT_TAGS = [
  '포토스트립', '현장사진', '백드롭',
];

export const ALL_DEFAULT_TAGS = [
  ...POPUP_DEFAULT_TAGS,
  ...WEDDING_DEFAULT_TAGS,
];
