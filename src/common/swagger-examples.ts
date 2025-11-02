// Общие примеры ответов для Swagger документации

export const SwaggerExamples = {
  // Auth examples
  authVerifyOtp: {
    success: true,
    auth_token:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1dWlkIiwicGhvbmVOdW1iZXIiOiIrOTk2NTU1MTIzNDU2Iiwicm9sZSI6IkNMSUVOVCIsImlhdCI6MTYxODAwMDAwMCwiZXhwIjoxNjE4NTk1MjAwfQ.example',
    is_new_user: false,
    user: {
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      phone_number: '+996555123456',
      full_name: 'Иван Петров',
      role: 'CLIENT',
      image_url: null,
      created_at: '2024-01-01T00:00:00.000Z',
    },
  },

  sendOtp: {
    success: true,
    message: 'Код отправлен на номер +996555123456',
    expires_in: 300,
  },

  // User examples
  userProfile: {
    success: true,
    user: {
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      phone_number: '+996555123456',
      full_name: 'Иван Петров',
      role: 'CLIENT',
      image_url: 'https://example.com/avatar.jpg',
      created_at: '2024-01-01T00:00:00.000Z',
    },
  },

  // Partner examples
  partnerProfile: {
    success: true,
    profile: {
      profile_id: '550e8400-e29b-41d4-a716-446655440001',
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      company_name: 'Туристическая компания "Горные тропы"',
      description: 'Профессиональные туристические туры по Кыргызстану',
      documents_url: 'https://example.com/documents.pdf',
      verification_status: 'PENDING',
      card_number: '1234567890123456',
    },
  },

  verificationStatus: {
    success: true,
    verification_status: 'PENDING',
    admin_comments: null,
    submitted_at: '2024-01-01T00:00:00.000Z',
    reviewed_at: '2024-01-01T00:00:00.000Z',
  },

  partnerStatistics: {
    success: true,
    statistics: {
      total_tours: 15,
      active_tours: 8,
      completed_tours: 5,
      cancelled_tours: 2,
      total_bookings: 127,
      total_revenue: 450000,
      average_rating: 4.5,
      total_reviews: 89,
    },
  },

  // Tour examples
  tourDetails: {
    success: true,
    tour: {
      tour_id: '550e8400-e29b-41d4-a716-446655440002',
      title: 'Тур по озеру Иссык-Куль',
      main_image_url: 'https://example.com/image.jpg',
      location: 'Озеро Иссык-Куль',
      tour_type: 'Активный отдых',
      date: '2024-06-15',
      time: '09:00',
      price: 5000,
      currency: 'KGS',
      available_spots: 20,
      description: 'Прекрасный однодневный тур',
      program: {
        '09:00': 'Встреча',
        '10:00': 'Выезд',
      },
      meeting_point: {
        address: 'Бишкек, пр. Чуй, 145',
        coordinates: '42.8746,74.5698',
      },
      whats_included: ['Трансфер', 'Обед'],
      whats_not_included: ['Личные расходы'],
      what_to_bring: 'Удобная одежда',
      image_gallery_urls: ['https://example.com/gallery1.jpg'],
      organizer: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        fullName: 'Иван Петров',
        imageUrl: 'https://example.com/avatar.jpg',
      },
      status: 'ACTIVE',
      average_rating: 4.5,
      reviews_count: 12,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    },
  },

  toursList: {
    success: true,
    tours: [],
    pagination: {
      page: 1,
      limit: 20,
      total_items: 0,
      total_pages: 0,
    },
  },

  tourReviews: {
    success: true,
    reviews: [
      {
        review_id: '550e8400-e29b-41d4-a716-446655440003',
        user: {
          id: '550e8400-e29b-41d4-a716-446655440004',
          fullName: 'Мария Сидорова',
          imageUrl: 'https://example.com/avatar2.jpg',
        },
        rating: 5,
        text: 'Отличный тур, очень понравилось!',
        created_at: '2024-01-15T10:00:00.000Z',
      },
    ],
    pagination: {
      page: 1,
      limit: 20,
      total_items: 1,
      total_pages: 1,
    },
  },

  // Booking examples
  bookingCreated: {
    success: true,
    booking: {
      booking_id: '550e8400-e29b-41d4-a716-446655440005',
      tour: {
        id: '550e8400-e29b-41d4-a716-446655440002',
        title: 'Тур по озеру Иссык-Куль',
        date: '2024-06-15T00:00:00.000Z',
        time: '09:00',
      },
      seats_count: 2,
      total_amount: 10000,
      status: 'PENDING',
      name: 'Иван Петров',
      email: 'ivan@example.com',
      created_at: '2024-01-01T00:00:00.000Z',
    },
  },

  bookingsList: {
    success: true,
    bookings: [],
    pagination: {
      page: 1,
      limit: 20,
      total_items: 0,
      total_pages: 0,
    },
  },

  // Review examples
  reviewCreated: {
    success: true,
    review: {
      review_id: '550e8400-e29b-41d4-a716-446655440006',
      tour_id: '550e8400-e29b-41d4-a716-446655440002',
      user: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        fullName: 'Иван Петров',
        imageUrl: 'https://example.com/avatar.jpg',
      },
      rating: 5,
      text: 'Отличный тур!',
      created_at: '2024-01-01T00:00:00.000Z',
    },
  },

  // Upload examples
  fileUploaded: {
    success: true,
    data: {
      url: 'https://storage.googleapis.com/your-bucket/images/1234567890-image.jpg',
    },
  },

  // Admin examples
  adminPartners: {
    success: true,
    partners: [],
    pagination: {
      page: 1,
      limit: 20,
      total_items: 0,
      total_pages: 0,
    },
  },

  partnerVerified: {
    success: true,
    message: 'Partner verified successfully',
    profile: {
      profile_id: '550e8400-e29b-41d4-a716-446655440001',
      user: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        phoneNumber: '+996555123456',
        fullName: 'Иван Петров',
      },
      company_name: 'Туристическая компания "Горные тропы"',
      verification_status: 'VERIFIED',
      verification_comment: 'Все документы подтверждены',
    },
  },

  platformStatistics: {
    success: true,
    statistics: {
      users: {
        total: 150,
        clients: 120,
        partners: 30,
      },
      partners: {
        verified: 25,
        pending: 5,
      },
      tours: {
        total: 200,
        active: 150,
        completed: 50,
      },
      bookings: {
        total: 1250,
        paid: 1100,
        total_revenue: 5500000,
      },
      reviews: {
        total: 450,
        average_rating: 4.6,
      },
    },
  },
};
