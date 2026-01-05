import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting to seed tours...');

  // Сначала найдем или создадим верифицированного партнера
  let partner = await prisma.user.findFirst({
    where: {
      role: 'PARTNER',
      partnerProfile: {
        verificationStatus: 'VERIFIED',
      },
    },
    include: {
      partnerProfile: true,
    },
  });

  // Если нет верифицированного партнера, создадим его
  if (!partner) {
    console.log('Creating verified partner...');
    partner = await prisma.user.create({
      data: {
        email: 'partner@demal.kg',
        fullName: 'Тестовый Партнер',
        role: 'PARTNER',
        phoneNumber: '+996700123456',
        imageUrl: 'https://i.pravatar.cc/150?img=1',
        partnerProfile: {
          create: {
            companyName: 'Demal Tours',
            description: 'Профессиональная туристическая компания',
            verificationStatus: 'VERIFIED',
            cardNumber: '1234567890123456',
          },
        },
      },
      include: {
        partnerProfile: true,
      },
    });
    console.log('Partner created:', partner.email);
  } else {
    console.log('Using existing partner:', partner.email);
  }

  // Массив тестовых туров
  const tours = [
    {
      title: 'Тур по озеру Иссык-Куль',
      mainImageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
      location: 'Озеро Иссык-Куль',
      tourType: 'Природа и пейзажи',
      date: new Date('2026-02-15'),
      time: '08:00',
      price: 3500,
      currency: 'KGS',
      availableSpots: 15,
      description: 'Незабываемое путешествие к жемчужине Кыргызстана - озеру Иссык-Куль. Насладитесь кристально чистой водой и горными пейзажами.',
      program: {
        '08:00': 'Встреча группы в Бишкеке',
        '09:00': 'Выезд к озеру',
        '12:00': 'Прибытие, обед',
        '14:00': 'Экскурсия по побережью',
        '18:00': 'Возвращение в Бишкек',
      },
      meetingPoint: {
        address: 'Бишкек, пр. Чуй, 145',
        coordinates: '42.8746,74.5698',
      },
      whatsIncluded: ['Трансфер', 'Обед', 'Гид', 'Страховка'],
      whatsNotIncluded: ['Личные расходы', 'Алкогольные напитки'],
      whatToBring: 'Удобная одежда, солнцезащитный крем, купальник, вода',
      imageGalleryUrls: [
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
        'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800',
      ],
    },
    {
      title: 'Восхождение на пик Ленина',
      mainImageUrl: 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e',
      location: 'Пик Ленина',
      tourType: 'Альпинизм',
      date: new Date('2026-07-01'),
      time: '06:00',
      price: 45000,
      currency: 'KGS',
      availableSpots: 8,
      description: 'Экспедиция для опытных альпинистов на один из семитысячников Памира.',
      program: {
        'День 1': 'Акклиматизация в базовом лагере',
        'День 2-3': 'Восхождение к промежуточным лагерям',
        'День 4': 'Штурм вершины',
        'День 5': 'Спуск',
      },
      meetingPoint: {
        address: 'Ош, аэропорт',
        coordinates: '40.5283,72.7985',
      },
      whatsIncluded: ['Гид-альпинист', 'Питание', 'Снаряжение', 'Страховка'],
      whatsNotIncluded: ['Авиабилеты', 'Личное снаряжение'],
      whatToBring: 'Альпинистское снаряжение, теплая одежда, спальник',
      imageGalleryUrls: [
        'https://images.unsplash.com/photo-1519904981063-b0cf448d479e',
        'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b',
      ],
    },
    {
      title: 'Конный тур в Сон-Куль',
      mainImageUrl: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a',
      location: 'Озеро Сон-Куль',
      tourType: 'Конные туры',
      date: new Date('2026-06-10'),
      time: '07:00',
      price: 8500,
      currency: 'KGS',
      availableSpots: 12,
      description: 'Трехдневный конный поход к высокогорному озеру Сон-Куль с проживанием в юртах.',
      program: {
        'День 1': 'Переезд в Кочкор, начало конного похода',
        'День 2': 'Прибытие на Сон-Куль, отдых',
        'День 3': 'Возвращение',
      },
      meetingPoint: {
        address: 'Бишкек, Западный автовокзал',
      },
      whatsIncluded: ['Лошади', 'Проживание в юртах', 'Питание', 'Гид'],
      whatsNotIncluded: ['Личные расходы', 'Сувениры'],
      whatToBring: 'Теплая одежда, удобная обувь, фонарик',
      imageGalleryUrls: [
        'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a',
        'https://images.unsplash.com/photo-1551632811-561732d1e306',
      ],
    },
    {
      title: 'Культурный тур по Бишкеку',
      mainImageUrl: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b',
      location: 'Бишкек',
      tourType: 'Культурный туризм',
      date: new Date('2026-02-20'),
      time: '10:00',
      price: 1500,
      currency: 'KGS',
      availableSpots: 20,
      description: 'Пешеходная экскурсия по столице Кыргызстана с посещением главных достопримечательностей.',
      program: {
        '10:00': 'Площадь Ала-Тоо',
        '11:00': 'Исторический музей',
        '13:00': 'Обед в национальном ресторане',
        '15:00': 'Ошский базар',
        '17:00': 'Завершение тура',
      },
      meetingPoint: {
        address: 'Бишкек, площадь Ала-Тоо',
        coordinates: '42.8765,74.6098',
      },
      whatsIncluded: ['Гид', 'Входные билеты', 'Обед'],
      whatsNotIncluded: ['Трансфер', 'Сувениры'],
      whatToBring: 'Удобная обувь, фотоаппарат',
      imageGalleryUrls: [
        'https://images.unsplash.com/photo-1555881400-74d7acaacd8b',
        'https://images.unsplash.com/photo-1533929736458-ca588d08c8be',
      ],
    },
    {
      title: 'Треккинг в Ала-Арче',
      mainImageUrl: 'https://images.unsplash.com/photo-1551632811-561732d1e306',
      location: 'Национальный парк Ала-Арча',
      tourType: 'Треккинг',
      date: new Date('2026-03-05'),
      time: '08:00',
      price: 2500,
      currency: 'KGS',
      availableSpots: 15,
      description: 'Однодневный треккинг в живописном ущелье Ала-Арча с посещением водопада.',
      program: {
        '08:00': 'Выезд из Бишкека',
        '09:00': 'Начало треккинга',
        '12:00': 'Пикник у водопада',
        '15:00': 'Возвращение',
        '17:00': 'Прибытие в Бишкек',
      },
      meetingPoint: {
        address: 'Бишкек, пр. Манаса, 40',
      },
      whatsIncluded: ['Трансфер', 'Гид', 'Пикник', 'Страховка'],
      whatsNotIncluded: ['Личные расходы'],
      whatToBring: 'Треккинговая обувь, рюкзак, вода, дождевик',
      imageGalleryUrls: [
        'https://images.unsplash.com/photo-1551632811-561732d1e306',
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
      ],
    },
    {
      title: 'Джип-тур по Тянь-Шаню',
      mainImageUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800',
      location: 'Горы Тянь-Шань',
      tourType: 'Джип-туры',
      date: new Date('2026-05-15'),
      time: '07:00',
      price: 12000,
      currency: 'KGS',
      availableSpots: 6,
      description: 'Экстремальный джип-тур по горным перевалам Тянь-Шаня.',
      program: {
        '07:00': 'Выезд из Бишкека',
        '10:00': 'Перевал Тоо-Ашуу',
        '13:00': 'Обед в горах',
        '16:00': 'Посещение горных озер',
        '20:00': 'Возвращение',
      },
      meetingPoint: {
        address: 'Бишкек, гостиница Хаятт',
      },
      whatsIncluded: ['Джип с водителем', 'Обед', 'Гид'],
      whatsNotIncluded: ['Личные расходы', 'Дополнительное питание'],
      whatToBring: 'Теплая одежда, фотоаппарат, солнцезащитные очки',
      imageGalleryUrls: [
        'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800',
        'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b',
      ],
    },
    {
      title: 'Этно-тур в Каракол',
      mainImageUrl: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be',
      location: 'Каракол',
      tourType: 'Культурный туризм',
      date: new Date('2026-04-12'),
      time: '09:00',
      price: 5500,
      currency: 'KGS',
      availableSpots: 10,
      description: 'Двухдневный тур с погружением в культуру и традиции Кыргызстана.',
      program: {
        'День 1': 'Переезд в Каракол, посещение Дунганской мечети',
        'День 2': 'Мастер-класс по приготовлению национальных блюд, возвращение',
      },
      meetingPoint: {
        address: 'Бишкек, Восточный автовокзал',
      },
      whatsIncluded: ['Трансфер', 'Проживание', 'Питание', 'Мастер-классы'],
      whatsNotIncluded: ['Сувениры', 'Личные расходы'],
      whatToBring: 'Удобная одежда, фотоаппарат',
      imageGalleryUrls: [
        'https://images.unsplash.com/photo-1533929736458-ca588d08c8be',
        'https://images.unsplash.com/photo-1555881400-74d7acaacd8b',
      ],
    },
    {
      title: 'Рафтинг на реке Чу',
      mainImageUrl: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29',
      location: 'Река Чу',
      tourType: 'Активный отдых',
      date: new Date('2026-06-20'),
      time: '08:00',
      price: 4500,
      currency: 'KGS',
      availableSpots: 12,
      description: 'Экстремальный сплав по горной реке для любителей адреналина.',
      program: {
        '08:00': 'Выезд к реке',
        '10:00': 'Инструктаж и начало сплава',
        '13:00': 'Обед на берегу',
        '15:00': 'Продолжение сплава',
        '18:00': 'Возвращение',
      },
      meetingPoint: {
        address: 'Бишкек, ТЦ Дордой Плаза',
      },
      whatsIncluded: ['Снаряжение', 'Инструктор', 'Обед', 'Трансфер'],
      whatsNotIncluded: ['Личные расходы'],
      whatToBring: 'Сменная одежда, полотенце, водонепроницаемый чехол для телефона',
      imageGalleryUrls: [
        'https://images.unsplash.com/photo-1501594907352-04cda38ebc29',
        'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b',
      ],
    },
    {
      title: 'Фототур по Кыргызстану',
      mainImageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b',
      location: 'Различные локации',
      tourType: 'Фототуры',
      date: new Date('2026-08-01'),
      time: '06:00',
      price: 25000,
      currency: 'KGS',
      availableSpots: 8,
      description: 'Недельный фототур по самым живописным местам Кыргызстана с профессиональным фотографом.',
      program: {
        'День 1-2': 'Иссык-Куль',
        'День 3-4': 'Сон-Куль',
        'День 5-6': 'Ала-Арча',
        'День 7': 'Возвращение',
      },
      meetingPoint: {
        address: 'Бишкек, аэропорт Манас',
      },
      whatsIncluded: ['Трансфер', 'Проживание', 'Питание', 'Фотограф-гид'],
      whatsNotIncluded: ['Авиабилеты', 'Личные расходы'],
      whatToBring: 'Фотоаппарат, объективы, штатив, теплая одежда',
      imageGalleryUrls: [
        'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b',
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
      ],
    },
    {
      title: 'Зимний тур на горнолыжный курорт',
      mainImageUrl: 'https://images.unsplash.com/photo-1551524559-8af4e6624178',
      location: 'Каракол (горнолыжная база)',
      tourType: 'Горнолыжный туризм',
      date: new Date('2026-01-15'),
      time: '08:00',
      price: 6500,
      currency: 'KGS',
      availableSpots: 15,
      description: 'Двухдневный тур на горнолыжную базу с катанием и отдыхом.',
      program: {
        'День 1': 'Переезд, размещение, катание',
        'День 2': 'Катание, возвращение',
      },
      meetingPoint: {
        address: 'Бишкек, пр. Чуй, 200',
      },
      whatsIncluded: ['Трансфер', 'Проживание', 'Ски-пасс'],
      whatsNotIncluded: ['Аренда снаряжения', 'Питание', 'Инструктор'],
      whatToBring: 'Лыжное снаряжение или деньги на аренду, теплая одежда',
      imageGalleryUrls: [
        'https://images.unsplash.com/photo-1551524559-8af4e6624178',
        'https://images.unsplash.com/photo-1519904981063-b0cf448d479e',
      ],
    },
    {
      title: 'Велотур вокруг Иссык-Куля',
      mainImageUrl: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182',
      location: 'Озеро Иссык-Куль',
      tourType: 'Велотуры',
      date: new Date('2026-07-15'),
      time: '07:00',
      price: 18000,
      currency: 'KGS',
      availableSpots: 10,
      description: 'Пятидневный велотур вокруг озера Иссык-Куль с остановками в живописных местах.',
      program: {
        'День 1': 'Бишкек - Чолпон-Ата (100 км)',
        'День 2': 'Чолпон-Ата - Каракол (150 км)',
        'День 3': 'Каракол - Боконбаево (120 км)',
        'День 4': 'Боконбаево - Балыкчы (100 км)',
        'День 5': 'Балыкчы - Бишкек (трансфер)',
      },
      meetingPoint: {
        address: 'Бишкек, велоклуб Тянь-Шань',
      },
      whatsIncluded: ['Велосипед', 'Проживание', 'Питание', 'Сопровождение'],
      whatsNotIncluded: ['Личные расходы', 'Дополнительные экскурсии'],
      whatToBring: 'Спортивная одежда, шлем, перчатки, солнцезащитный крем',
      imageGalleryUrls: [
        'https://images.unsplash.com/photo-1541625602330-2277a4c46182',
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
      ],
    },
    {
      title: 'Экскурсия в Бурану',
      mainImageUrl: 'https://images.unsplash.com/photo-1548013146-72479768bada',
      location: 'Башня Бурана',
      tourType: 'Исторический туризм',
      date: new Date('2026-03-25'),
      time: '10:00',
      price: 2000,
      currency: 'KGS',
      availableSpots: 25,
      description: 'Однодневная экскурсия к древней башне Бурана и музею под открытым небом.',
      program: {
        '10:00': 'Выезд из Бишкека',
        '11:00': 'Прибытие к башне Бурана',
        '11:30': 'Экскурсия по комплексу',
        '13:00': 'Обед',
        '15:00': 'Возвращение',
      },
      meetingPoint: {
        address: 'Бишкек, площадь Победы',
      },
      whatsIncluded: ['Трансфер', 'Гид', 'Входные билеты', 'Обед'],
      whatsNotIncluded: ['Сувениры'],
      whatToBring: 'Удобная обувь, головной убор, фотоаппарат',
      imageGalleryUrls: [
        'https://images.unsplash.com/photo-1548013146-72479768bada',
        'https://images.unsplash.com/photo-1533929736458-ca588d08c8be',
      ],
    },
    {
      title: 'Кемпинг в горах',
      mainImageUrl: 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d',
      location: 'Горы Ала-Тоо',
      tourType: 'Кемпинг',
      date: new Date('2026-06-05'),
      time: '16:00',
      price: 3500,
      currency: 'KGS',
      availableSpots: 12,
      description: 'Ночевка в палатках в горах с костром и наблюдением за звездами.',
      program: {
        '16:00': 'Выезд из города',
        '18:00': 'Установка лагеря',
        '19:00': 'Ужин у костра',
        '21:00': 'Наблюдение за звездами',
        '08:00': 'Завтрак и возвращение',
      },
      meetingPoint: {
        address: 'Бишкек, парк Ататюрк',
      },
      whatsIncluded: ['Палатки', 'Спальники', 'Питание', 'Гид'],
      whatsNotIncluded: ['Личное снаряжение'],
      whatToBring: 'Теплая одежда, фонарик, коврик',
      imageGalleryUrls: [
        'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d',
        'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b',
      ],
    },
    {
      title: 'Гастрономический тур',
      mainImageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1',
      location: 'Бишкек и окрестности',
      tourType: 'Гастрономический туризм',
      date: new Date('2026-04-18'),
      time: '11:00',
      price: 4000,
      currency: 'KGS',
      availableSpots: 15,
      description: 'Знакомство с кыргызской кухней через посещение лучших ресторанов и мастер-классы.',
      program: {
        '11:00': 'Посещение Ошского базара',
        '13:00': 'Обед в национальном ресторане',
        '15:00': 'Мастер-класс по приготовлению бешбармака',
        '17:00': 'Дегустация кумыса',
        '19:00': 'Завершение тура',
      },
      meetingPoint: {
        address: 'Бишкек, Ошский базар',
      },
      whatsIncluded: ['Гид', 'Все дегустации', 'Мастер-класс'],
      whatsNotIncluded: ['Трансфер', 'Дополнительные покупки'],
      whatToBring: 'Хорошее настроение и аппетит',
      imageGalleryUrls: [
        'https://images.unsplash.com/photo-1555939594-58d7cb561ad1',
        'https://images.unsplash.com/photo-1533929736458-ca588d08c8be',
      ],
    },
    {
      title: 'Йога-ретрит в горах',
      mainImageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773',
      location: 'Горы Ала-Арча',
      tourType: 'Оздоровительный туризм',
      date: new Date('2026-05-22'),
      time: '09:00',
      price: 9500,
      currency: 'KGS',
      availableSpots: 10,
      description: 'Трехдневный йога-ретрит с медитациями и здоровым питанием в горах.',
      program: {
        'День 1': 'Прибытие, вечерняя йога',
        'День 2': 'Утренняя йога, медитация, прогулки',
        'День 3': 'Йога, возвращение',
      },
      meetingPoint: {
        address: 'Бишкек, йога-студия Намасте',
      },
      whatsIncluded: ['Проживание', 'Питание', 'Занятия йогой', 'Трансфер'],
      whatsNotIncluded: ['Личные расходы'],
      whatToBring: 'Коврик для йоги, удобная одежда, теплые вещи',
      imageGalleryUrls: [
        'https://images.unsplash.com/photo-1506126613408-eca07ce68773',
        'https://images.unsplash.com/photo-1551632811-561732d1e306',
      ],
    },
  ];

  // Создаем туры
  console.log(`Creating ${tours.length} tours...`);
  let createdCount = 0;

  for (const tourData of tours) {
    try {
      await prisma.tour.create({
        data: {
          ...tourData,
          organizerId: partner.id,
        },
      });
      createdCount++;
      console.log(`✓ Created: ${tourData.title}`);
    } catch (error) {
      console.error(`✗ Failed to create: ${tourData.title}`, error.message);
    }
  }

  console.log(`\nSeeding completed! Created ${createdCount} out of ${tours.length} tours.`);
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
