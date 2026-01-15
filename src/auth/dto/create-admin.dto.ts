import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAdminDto {
  @ApiProperty({ example: 'admin@example.com', description: 'Email для регистрации админа' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'secret-key-123', description: 'Секретный ключ для создания админа' })
  @IsString()
  @IsNotEmpty()
  secret_key: string;
}
