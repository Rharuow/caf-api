import {
  Controller,
  UseGuards,
  Get,
  Param,
  Post,
  Body,
  Patch,
  Query,
  Delete,
} from '@nestjs/common';

import { OwnerResidentService } from './resident.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { Prisma, STATUS } from '@prisma/client';
import { handleErrors } from 'src/handles/errors';

@Controller('users/:id/owners/:ownerId/residents')
export class OwnerResidentController {
  constructor(private readonly residentService: OwnerResidentService) {}

  @UseGuards(AuthGuard)
  @Get()
  async listResidents(
    @Param() { id, ownerId }: { id: string; ownerId: string },
    @Query()
    {
      page,
      name,
      cpf,
      allowed,
      blocked,
      processing,
    }: {
      page: number;
      name?: string;
      cpf?: string;
      blocked?: string;
      allowed?: string;
      processing?: string;
    },
  ) {
    try {
      const residents = await this.residentService.listResidents({
        id,
        ownerId,
        page,
        name,
        cpf,
        allowed,
        blocked,
        processing,
      });
      return residents;
    } catch (error) {
      console.error('Controller error = ', error);

      handleErrors(error);
    }
  }

  @UseGuards(AuthGuard)
  @Post()
  async createResident(
    @Param() { ownerId }: { ownerId: string },
    @Body()
    resident: Prisma.UserCreateInput & Prisma.ResidentCreateInput,
  ) {
    try {
      await this.residentService.createResident({ resident, ownerId });
    } catch (error) {
      handleErrors(error);
    }
  }

  @UseGuards(AuthGuard)
  @Delete('/:userResidentId/:residentId')
  async removeResident(
    @Param()
    {
      id,
      ownerId,
      residentId,
      userResidentId,
    }: {
      id: string;
      ownerId: string;
      userResidentId: string;
      residentId: string;
    },
  ) {
    try {
      return await this.residentService.removeResident({
        residentId,
        userResidentId,
        id,
        ownerId,
      });
    } catch (error) {
      handleErrors(error);
    }
  }

  @UseGuards(AuthGuard)
  @Patch('/update')
  async updateResident(
    @Body()
    user: Prisma.UserCreateInput & { resident: Prisma.ResidentCreateInput },
    @Param() { id, ownerId }: { id: string; ownerId: string },
  ) {
    try {
      return await this.residentService.updateResident({
        id,
        ownerId,
        residentId: user.resident.id,
        user,
      });
    } catch (error) {
      handleErrors(error);
    }
  }

  @UseGuards(AuthGuard)
  @Patch('/:userResidentId/:residentId/available')
  async updateAvailableStatus(
    @Body()
    data: {
      status: STATUS;
      justifications: Array<string>;
    },
    @Param()
    {
      id,
      residentId,
      userResidentId,
    }: {
      id: string;
      residentId: string;
      userResidentId: string;
    },
  ) {
    const { justifications, status } = data;
    try {
      return await this.residentService.updateAvailableStatus({
        residentId,
        userOwnerId: id,
        userResidentId,
        status,
        justifications,
      });
    } catch (error) {
      console.error(error);
      handleErrors(error);
    }
  }

  @UseGuards(AuthGuard)
  @Patch('/:userResidentId/:residentId/allow')
  async allowOwner(
    @Param()
    {
      id,
      ownerId,
      residentId,
      userResidentId,
    }: {
      id: string;
      ownerId: string;
      residentId: string;
      userResidentId: string;
    },
  ) {
    try {
      return await this.residentService.allowResident({
        ownerId,
        residentId,
        userOwnerId: id,
        userResidentId,
      });
    } catch (error) {
      console.error('Controller error = ', error);

      handleErrors(error);
    }
  }

  @UseGuards(AuthGuard)
  @Get('/:userResidentId/:residentId/send-invite')
  async getSendInvite(
    @Param()
    {
      residentId,
      userResidentId,
    }: {
      residentId: string;
      userResidentId: string;
    },
  ) {
    try {
      return await this.residentService.sendInvite({
        id: userResidentId,
        residentId,
      });
    } catch (error) {
      handleErrors(error);
    }
  }
}
