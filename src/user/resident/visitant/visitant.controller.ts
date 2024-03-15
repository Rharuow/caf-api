import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  UseGuards,
} from '@nestjs/common';
import { VisitantService } from './visitant.service';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('users/:id/residents/:residentId/visitants')
export class VisitantController {
  constructor(private readonly visitantService: VisitantService) {}

  @UseGuards(AuthGuard)
  @Get()
  async listVisitants(
    @Param() { id, residentId }: { id: string; residentId: string },
  ) {
    try {
      return await this.visitantService.listVisitants({ id, residentId });
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'Resource not found',
        },
        HttpStatus.NOT_FOUND,
        {
          cause: error,
        },
      );
    }
  }
}
