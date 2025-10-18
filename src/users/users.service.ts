import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { pick3HealthBenefits } from '../utils/pick-health-benefits';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    if (!dto.id_card) {
      throw new BadRequestException('id_card is required');
    }

    const exists = await this.prisma.user.findUnique({
      where: { id_card: dto.id_card },
    });
    if (exists) throw new ConflictException('ID card already registered');
    const id_card = dto.id_card;
    const name = dto.name;
    const lastname = dto.lastname;
    const phone = dto.phone;
    const role = 'patient';
    const username = await this.nextHN();
    const password = await bcrypt.hash(dto.password, 12);
    const health_benefits =
      dto.health_benefits && dto.health_benefits.length >= 1
        ? dto.health_benefits.slice(0, 3)
        : pick3HealthBenefits();

    const user = await this.prisma.user.create({
      data: {
        id_card,
        name,
        lastname,
        password,
        phone,
        role,
        health_benefits,
        username,
      },
      select: {
        id: true,
        id_card: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (role === 'patient') {
      await this.prisma.patient.create({
        data: { id: user.id, hospital_number: username },
      });
    } else if (role === 'doctor') {
      await this.prisma.doctor.create({ data: { id: user.id } });
    }

    return user;
  }

  private async nextHN(): Promise<string> {
    const yy = (new Date().getFullYear() % 100).toString().padStart(2, '0');
    const seq = (await this.prisma.user.count()) + 1;
    return `HN${yy}${seq.toString().padStart(6, '0')}`;
  }

  async findByUserName(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async findById(idParam: string | number | undefined) {
    if (idParam === undefined || idParam === null || idParam === '') {
      throw new BadRequestException('id is required');
    }

    // ถ้า schema เป็น Int @id
    let where: any;
    if (typeof idParam === 'string' && /^\d+$/.test(idParam)) {
      where = { id: Number(idParam) };
    } else {
      where = { id: idParam }; // กรณี String @id (uuid)
    }

    return this.prisma.user.findUnique({ where });
  }
}
