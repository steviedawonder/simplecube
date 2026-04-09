/**
 * Seed script to insert new FAQ content for rental, corporate, general, and pricing pages.
 * Run after deploying the migrated DB schema.
 *
 * Usage: npx tsx scripts/seed-new-faqs.ts
 * Or call via the API from the running dev server.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:4321';

interface FaqEntry {
  page: string;
  question: string;
  answer: string;
  sort_order: number;
}

const newFaqs: FaqEntry[] = [
  // rental page FAQs
  { page: 'rental', question: '포토부스 렌탈 비용은 얼마인가요?', answer: '심플큐브 포토부스 렌탈은 행사 규모와 운영 시간에 따라 달라지며, 기본 2시간 기준으로 안내드리고 있습니다. 14,000건 이상의 행사 운영 경험을 바탕으로 행사 목적에 최적화된 패키지를 제안해 드립니다. 서울, 부산, 대전, 전주 4개 거점에서 출장 설치가 가능하며, 정확한 견적은 행사 일정과 장소를 알려주시면 당일 내 회신드립니다.', sort_order: 0 },
  { page: 'rental', question: '렌탈 시 설치와 철거는 어떻게 진행되나요?', answer: '심플큐브 전문 스태프가 행사 시작 1~2시간 전에 현장에 도착하여 설치를 완료합니다. 원목 소재 포토부스는 조립식으로 설계되어 약 30~40분 내 설치가 가능하며, 행사 종료 후 철거까지 모두 포함된 원스톱 서비스입니다. 설치 공간은 최소 2m x 2m 정도가 필요하며, 전원 콘센트 1개만 준비해 주시면 됩니다.', sort_order: 1 },
  { page: 'rental', question: '렌탈 예약은 얼마나 전에 해야 하나요?', answer: '최소 2주 전 예약을 권장하며, 주말 및 성수기(5~6월, 10~11월)에는 1개월 전 예약이 필요합니다. 심플큐브는 서울, 부산, 대전, 전주 4개 지역에서 동시 운영이 가능하지만, 인기 날짜는 조기 마감되는 경우가 많습니다. 예약금 입금 시점에 일정이 확정되며, 행사 7일 전까지 무료 일정 변경이 가능합니다.', sort_order: 2 },
  { page: 'rental', question: '렌탈 포토부스에서 촬영한 사진은 어떻게 받나요?', answer: '촬영 즉시 고품질 인화물이 출력되며, 동시에 QR코드를 통해 원본 디지털 파일을 다운로드할 수 있습니다. 행사 종료 후 3일 이내에 전체 촬영 데이터를 클라우드 링크로 전달해 드립니다. 인화 프레임 디자인은 행사 컨셉에 맞춰 사전 맞춤 제작이 가능합니다.', sort_order: 3 },
  { page: 'rental', question: '야외 행사에도 렌탈이 가능한가요?', answer: '네, 심플큐브 원목 포토부스는 야외 행사에도 설치 가능합니다. 다만 직사광선과 우천을 대비해 텐트 또는 차양막 아래 설치를 권장하며, 야외 전용 조명 세팅을 추가로 제공합니다. 14,000건 이상의 행사 중 약 30%가 야외에서 진행되었으며, 정원 웨딩, 루프탑 파티, 페스티벌 등 다양한 야외 환경에서의 운영 노하우를 보유하고 있습니다.', sort_order: 4 },

  // corporate page FAQs
  { page: 'corporate', question: '어떤 기업들이 심플큐브를 이용했나요?', answer: '심플큐브는 삼성, 나이키, 구찌 등 글로벌 브랜드를 포함하여 다수의 대기업 및 외국계 기업 행사를 진행한 경험이 있습니다. 신제품 런칭 이벤트, 기업 연말 파티, 브랜드 팝업스토어, 컨퍼런스 등 다양한 형태의 기업행사에 최적화된 서비스를 제공합니다. 기업 CI에 맞춘 프레임 디자인과 브랜딩 커스터마이징이 기본 포함됩니다.', sort_order: 0 },
  { page: 'corporate', question: '기업행사용 포토부스 커스터마이징은 어디까지 가능한가요?', answer: '포토 프레임 디자인, 부스 외관 래핑, 배경 스크린, 소품 제작까지 브랜드 아이덴티티에 맞춘 풀 커스터마이징이 가능합니다. 기업 로고, 슬로건, 캠페인 해시태그를 프레임에 삽입할 수 있으며, 촬영 사진에 워터마크 적용도 지원합니다. 커스터마이징 시안은 행사 5일 전까지 확정하며, 수정은 2회까지 무료로 진행됩니다.', sort_order: 1 },
  { page: 'corporate', question: '대규모 기업행사(200명 이상)도 운영 가능한가요?', answer: '네, 심플큐브는 동시에 2대 이상의 포토부스를 투입하여 대규모 행사에 대응할 수 있습니다. 200명 기준 2대 운영 시 대기 시간을 5분 이내로 관리하며, 500명 이상 행사에서도 3~4대 동시 운영 경험이 있습니다. 전담 현장 매니저가 배치되어 인원 흐름과 대기열을 효율적으로 관리합니다.', sort_order: 2 },
  { page: 'corporate', question: '기업행사 촬영 데이터를 실시간으로 활용할 수 있나요?', answer: '촬영 즉시 QR코드를 통해 참가자가 개인 스마트폰으로 사진을 다운로드하고 SNS에 공유할 수 있습니다. 기업 해시태그와 함께 공유되도록 설정이 가능하여, 행사 현장에서 실시간 바이럴 마케팅 효과를 기대할 수 있습니다. 행사 종료 후에는 전체 촬영 데이터와 참여 통계 리포트를 제공합니다.', sort_order: 3 },
  { page: 'corporate', question: '기업행사 포토부스 운영 시간은 어떻게 되나요?', answer: '기업행사 기본 운영 시간은 3시간이며, 1시간 단위로 연장이 가능합니다. 종일 행사(8시간 이상)의 경우 별도 할인 패키지를 적용해 드리며, 스태프 교대 운영으로 끊김 없는 서비스를 보장합니다. 세미나, 컨퍼런스 등 장시간 행사에서는 쉬는 시간과 네트워킹 타임에 집중 운영하는 전략적 시간 배분도 제안드립니다.', sort_order: 4 },

  // general FAQs
  { page: 'general', question: '심플큐브 포토부스는 일반 포토부스와 무엇이 다른가요?', answer: '심플큐브는 원목 소재를 사용한 프리미엄 포토부스 브랜드로, 대량 생산되는 플라스틱 부스와 차별화됩니다. 14,000건 이상의 행사 경험에서 검증된 조명 시스템과 고화질 카메라를 사용하여 전문 스튜디오급 촬영 품질을 제공합니다. 서울, 부산, 대전, 전주 4개 거점을 운영하는 국내 최대 규모의 포토부스 서비스입니다.', sort_order: 0 },
  { page: 'general', question: '웨딩 포토부스 42만 원 패키지에는 무엇이 포함되나요?', answer: '42만 원 웨딩 패키지는 원목 포토부스 설치, 전문 스태프 1명, 2시간 운영, 무제한 촬영 및 인화, 맞춤 프레임 디자인을 포함합니다. 추가로 신랑신부 이름과 웨딩 날짜가 새겨진 커스텀 프레임이 기본 제공되며, 게스트 전원에게 QR코드를 통한 디지털 사진 전달 서비스도 포함됩니다. 웨딩 촬영 7,000건 이상의 노하우로 식장 동선과 하객 흐름에 맞춘 최적의 위치에 설치합니다.', sort_order: 1 },
  { page: 'general', question: '포토부스 촬영 시 소품도 제공되나요?', answer: '네, 심플큐브는 행사 유형에 맞춘 기본 소품 세트를 무료로 제공합니다. 웨딩용(화관, 부케, 액자), 생일파티용(왕관, 안경, 말풍선), 기업행사용(브랜드 소품) 등 카테고리별로 준비되어 있습니다. 특별한 컨셉의 소품이 필요한 경우 사전 요청 시 맞춤 제작도 가능하며, 추가 비용은 소품 종류에 따라 별도 안내드립니다.', sort_order: 2 },
  { page: 'general', question: '촬영 사진의 인화 품질은 어떤가요?', answer: '심플큐브는 열승화 방식의 전문 포토 프린터를 사용하여 촬영 후 약 15초 만에 고품질 인화물을 출력합니다. 인화 사이즈는 4x6인치(기본)와 2컷 스트립 중 선택 가능하며, 방수 코팅 처리되어 오래 보관할 수 있습니다. 일반 즉석 사진 대비 해상도가 2배 이상 높아 선명한 결과물을 제공합니다.', sort_order: 3 },
  { page: 'general', question: '행사 당일 기술적 문제가 발생하면 어떻게 하나요?', answer: '심플큐브는 모든 행사에 숙련된 전문 스태프가 동행하며, 장비 이중화 시스템을 갖추고 있어 현장에서 즉각 대응이 가능합니다. 14,000건 이상의 행사 운영 중 장비 문제로 인한 행사 중단률은 0.1% 미만이며, 만일의 상황에 대비해 예비 장비를 항상 준비합니다. 행사 전 기술 점검을 완료한 후 운영을 시작하며, 본사 기술 지원팀과 실시간 연결되어 있습니다.', sort_order: 4 },
];

async function seedFaqs() {
  console.log(`Seeding ${newFaqs.length} FAQs to ${BASE_URL}...`);

  for (const faq of newFaqs) {
    try {
      const res = await fetch(`${BASE_URL}/api/faqs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(faq),
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`✓ [${faq.page}] ${faq.question.slice(0, 30)}... → id:${data.id}`);
      } else {
        const err = await res.json();
        console.error(`✗ [${faq.page}] ${faq.question.slice(0, 30)}... → ${err.error}`);
      }
    } catch (e) {
      console.error(`✗ [${faq.page}] Network error:`, e);
    }
  }

  console.log('Done!');
}

seedFaqs();
