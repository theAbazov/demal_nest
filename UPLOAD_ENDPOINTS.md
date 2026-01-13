# Документация по эндпоинтам загрузки файлов

## Обзор

Система поддерживает три способа загрузки файлов:

1. **Одиночная загрузка** - один файл, один URL
2. **Множественная загрузка** - список файлов, список URLs
3. **Загрузка с ключами** - кастомные ключи, объект {ключ: URL}

Все эндпоинты требуют авторизации (JWT токен).

## Эндпоинты

### 1. Загрузка одного файла

**Endpoint:** `POST /api/v1/upload/single`

**Query параметры:**

- `type` (обязательный): `image` или `document`

**Body (multipart/form-data):**

- `file`: файл для загрузки

**Пример запроса (cURL):**

```bash
curl -X POST \
  'http://localhost:3000/api/v1/upload/single?type=image' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -F 'file=@/path/to/image.jpg'
```

**Пример ответа:**

```json
{
  "success": true,
  "data": {
    "url": "http://localhost:9000/demal-storage/images/1234567890-photo.jpg"
  }
}
```

**Использование в JavaScript:**

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch(
  'http://localhost:3000/api/v1/upload/single?type=image',
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  },
);

const result = await response.json();
console.log(result.data.url); // URL загруженного файла
```

---

### 2. Загрузка нескольких файлов списком

**Endpoint:** `POST /api/v1/upload/multiple`

**Query параметры:**

- `type` (обязательный): `image` или `document`

**Body (multipart/form-data):**

- `files`: массив файлов (максимум 10)

**Пример запроса (cURL):**

```bash
curl -X POST \
  'http://localhost:3000/api/v1/upload/multiple?type=image' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -F 'files=@/path/to/image1.jpg' \
  -F 'files=@/path/to/image2.jpg' \
  -F 'files=@/path/to/image3.jpg'
```

**Пример ответа:**

```json
{
  "success": true,
  "data": [
    {
      "url": "http://localhost:9000/demal-storage/images/1234567890-photo1.jpg"
    },
    {
      "url": "http://localhost:9000/demal-storage/images/1234567891-photo2.jpg"
    },
    {
      "url": "http://localhost:9000/demal-storage/images/1234567892-photo3.jpg"
    }
  ]
}
```

**Использование в JavaScript:**

```javascript
const formData = new FormData();
// Добавляем несколько файлов с одним именем поля "files"
for (let i = 0; i < fileInput.files.length; i++) {
  formData.append('files', fileInput.files[i]);
}

const response = await fetch(
  'http://localhost:3000/api/v1/upload/multiple?type=image',
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  },
);

const result = await response.json();
// result.data - массив объектов с URL
result.data.forEach((item, index) => {
  console.log(`File ${index + 1}: ${item.url}`);
});
```

---

### 3. Загрузка с кастомными ключами (key-value)

**Endpoint:** `POST /api/v1/upload/with-keys`

**Query параметры:**

- `type` (обязательный): `image` или `document`

**Body (multipart/form-data):**

- Любые поля с файлами, где имя поля - это ключ, который вы хотите получить в ответе

**Пример запроса (cURL):**

```bash
curl -X POST \
  'http://localhost:3000/api/v1/upload/with-keys?type=image' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -F 'mainImage=@/path/to/main.jpg' \
  -F 'galleryImage1=@/path/to/gallery1.jpg' \
  -F 'galleryImage2=@/path/to/gallery2.jpg' \
  -F 'thumbnail=@/path/to/thumb.jpg'
```

**Пример ответа:**

```json
{
  "success": true,
  "data": {
    "mainImage": "http://localhost:9000/demal-storage/images/1234567890-main.jpg",
    "galleryImage1": "http://localhost:9000/demal-storage/images/1234567891-gallery1.jpg",
    "galleryImage2": "http://localhost:9000/demal-storage/images/1234567892-gallery2.jpg",
    "thumbnail": "http://localhost:9000/demal-storage/images/1234567893-thumb.jpg"
  }
}
```

**Использование в JavaScript:**

```javascript
const formData = new FormData();
formData.append('mainImage', mainImageFile);
formData.append('galleryImage1', galleryImage1File);
formData.append('galleryImage2', galleryImage2File);

const response = await fetch(
  'http://localhost:3000/api/v1/upload/with-keys?type=image',
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  },
);

const result = await response.json();
// result.data - объект с ключами
console.log(result.data.mainImage); // URL главного изображения
console.log(result.data.galleryImage1); // URL первого изображения галереи
console.log(result.data.galleryImage2); // URL второго изображения галереи
```

---

## Примеры использования

### Пример 1: Создание тура с изображениями

```javascript
// Шаг 1: Загружаем файлы с ключами
const formData = new FormData();
formData.append('mainImage', mainImageFile);
formData.append('galleryImage1', galleryImage1File);
formData.append('galleryImage2', galleryImage2File);

const uploadResponse = await fetch('/api/v1/upload/with-keys?type=image', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});

const uploadResult = await uploadResponse.json();
const urls = uploadResult.data;

// Шаг 2: Создаем тур с полученными URLs
const tourData = {
  title: 'Мой тур',
  mainImageUrl: urls.mainImage,
  imageGalleryUrls: [urls.galleryImage1, urls.galleryImage2],
  // ... остальные поля
};

const tourResponse = await fetch('/api/v1/tours', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(tourData),
});
```

### Пример 2: Загрузка галереи изображений

```javascript
// Загружаем список файлов
const formData = new FormData();
for (let file of galleryFiles) {
  formData.append('files', file);
}

const response = await fetch('/api/v1/upload/multiple?type=image', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});

const result = await response.json();
const galleryUrls = result.data.map((item) => item.url);

// Используем URLs для обновления тура
await updateTour(tourId, { imageGalleryUrls: galleryUrls });
```

### Пример 3: Загрузка документов партнера

```javascript
const formData = new FormData();
formData.append('passport', passportFile);
formData.append('license', licenseFile);
formData.append('certificate', certificateFile);

const response = await fetch('/api/v1/upload/with-keys?type=document', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});

const result = await response.json();
const documentsUrl = JSON.stringify(result.data); // Сохраняем как JSON строку
```

````

---

### 4. Удаление файла

**Endpoint:** `DELETE /api/v1/upload`

**Body (JSON):**
```json
{
  "url": "http://localhost:9000/demal-storage/images/1234567890-photo.jpg"
}
````

**Пример запроса (cURL):**

```bash
curl -X DELETE \
  'http://localhost:3000/api/v1/upload' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "http://localhost:9000/demal-storage/images/1234567890-photo.jpg"
  }'
```

**Пример ответа:**

```json
{
  "success": true
}
```

**Использование в JavaScript:**

```javascript
const response = await fetch('http://localhost:3000/api/v1/upload', {
  method: 'DELETE',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: fileUrlToDelete,
  }),
});

const result = await response.json();
if (result.success) {
  console.log('File deleted successfully');
}
```

---

## Валидация файлов

### Для изображений (type=image):

- Разрешенные форматы: JPEG, JPG, PNG, WebP, GIF
- Максимальный размер: 10MB

### Для документов (type=document):

- Разрешенные форматы: PDF, DOC, DOCX
- Максимальный размер: 10MB

---

## Ошибки

### 400 Bad Request

- `No file provided` - файл не был передан
- `Invalid file type` - недопустимый тип файла
- `File size exceeds the maximum allowed size of 10MB` - файл слишком большой
- `Type must be either "image" or "document"` - неверный query параметр type

### 401 Unauthorized

- Отсутствует или неверный JWT токен

---

## Примечания

1. Все эндпоинты требуют JWT авторизации
2. Старый endpoint `POST /api/v1/upload` все еще работает для обратной совместимости, но помечен как deprecated
3. Для endpoint `/upload/with-keys` каждый файл должен быть отправлен с уникальным именем поля
4. Максимальное количество файлов для `/upload/multiple` - 10
5. Файлы автоматически сохраняются в соответствующие папки (`images/` или `documents/`)
