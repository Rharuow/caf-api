import { Injectable } from '@nestjs/common';
import { Justification, Prisma } from '@prisma/client';
import { visitantInMemory, visitantsInMemory } from 'src/libs/memory-cache';
import { PrismaService } from 'src/prisma/prisma.service';
import { resetUsers } from 'src/utils/resetCache';

@Injectable()
export class OwnerVisitantService {
  private readonly selectScope = {
    available: {
      select: {
        status: true,
        justifications: {
          select: {
            justification: {
              select: {
                description: true,
              },
            },
          },
        },
      },
    },
    name: true,
    cnh: true,
    cpf: true,
    documentUrl: true,
    email: true,
    id: true,
    kind: true,
    photo: true,
    phone: true,
  };

  private resetCache = resetUsers;

  constructor(private readonly prisma: PrismaService) {}

  async listVisitants({
    id,
    ownerId,
    page = 1,
    name,
    cpf,
  }: {
    id: string;
    ownerId: string;
    page: number;
    name?: string;
    cpf?: string;
  }) {
    const reference = `user-${id}-owner-${ownerId}-visitant-${page}-${name}-${cpf}`;

    const perPage = process.env.DEFAULT_PER_PAGE
      ? Number(process.env.DEFAULT_PER_PAGE)
      : 10;

    const visitantsCount = await this.prisma.visitant.count({
      where: {
        ownersOnVisitants: {
          some: {
            owner: {
              id: ownerId,
              userId: id,
            },
          },
        },
        ...(name && { name: { contains: name } }),
        ...(cpf && { cpf: { contains: cpf } }),
      },
    });

    const totalPages = Math.ceil(visitantsCount / perPage);

    try {
      if (!visitantsInMemory.hasItem(reference)) {
        const visitants = await this.prisma.visitant.findMany({
          where: {
            ownersOnVisitants: {
              some: {
                owner: {
                  id: ownerId,
                  userId: id,
                },
              },
            },
            ...(name && { name: { contains: name } }),
            ...(cpf && { cpf: { contains: cpf } }),
          },
          orderBy: { name: 'desc' },
          skip: (page - 1) * perPage,
          take: perPage,
          select: this.selectScope,
        });

        visitantsInMemory.storeExpiringItem(
          reference,
          visitants,
          process.env.NODE_ENV === 'test' ? 5 : 3600 * 24, // if test env expire in 5 miliseconds else 1 day
        );
      }
      return {
        resource: visitantsInMemory.retrieveItemValue(reference),
        totalPages,
      };
    } catch (error) {
      console.log('Visitante List Service =', error);

      throw error;
    }
  }

  async getVisitant({
    userId,
    visitantId,
  }: {
    userId: string;
    visitantId: string;
  }) {
    const reference = `user-${userId}-owner-visitant-${visitantId}`;
    try {
      if (!visitantInMemory.hasItem(reference)) {
        const visitant = await this.prisma.visitant.findUniqueOrThrow({
          where: {
            id: visitantId,
            owner: {
              userId,
            },
          },
          select: this.selectScope,
        });

        visitantInMemory.storeExpiringItem(
          reference,
          visitant,
          process.env.NODE_ENV === 'test' ? 5 : 3600 * 24, // if test env expire in 5 miliseconds else 1 day
        );
      }
      return visitantInMemory.retrieveItemValue(reference);
    } catch (error) {
      console.log('Visitante GET Service =', error);

      throw error;
    }
  }

  async createVisitant({
    visitant,
  }: {
    visitant: Prisma.VisitantCreateInput & { invitedBy: string };
  }) {
    try {
      await this.prisma.visitant.create({
        data: {
          cpf: visitant.cpf,
          kind: visitant.kind,
          name: visitant.name,
          phone: visitant.phone,
          owner: {
            connect: { id: visitant.invitedBy },
          },
          ownersOnVisitants: {
            create: {
              ownerId: visitant.invitedBy,
            },
          },
          available: {
            create: {
              status: 'PROCESSING',
              justifications: {
                create: {
                  justification: {
                    connect: {
                      description: 'Documentação pendente',
                    },
                  },
                },
              },
            },
          },
        },
      });

      return this.resetCache();
    } catch (error) {
      console.log('Visitante Create Service = ', error);

      throw error;
    }
  }

  async removeVisitant({
    cpf,
    id,
    ownerId,
  }: {
    id: string;
    ownerId: string;
    cpf: string;
  }) {
    try {
      const visitant = await this.prisma.visitant.findUniqueOrThrow({
        where: {
          cpf,
        },
      });
      await this.prisma.user.update({
        where: {
          id,
          owner: {
            id: ownerId,
          },
        },
        data: {
          owner: {
            update: {
              visitantsOnOwner: {
                delete: {
                  ownerId_visitantId: { ownerId, visitantId: visitant.id },
                },
              },
            },
          },
        },
      });
      return this.resetCache();
    } catch (error) {
      console.log('Visitante Remove Service = ', error);

      throw error;
    }
  }

  async addVisitant({
    cpf,
    id,
    ownerId,
  }: {
    id: string;
    ownerId: string;
    cpf: string;
  }) {
    try {
      await this.prisma.user.update({
        where: {
          id,
          owner: {
            id: ownerId,
          },
        },
        data: {
          owner: {
            update: {
              visitantsOnOwner: {
                create: {
                  visitant: { connect: { cpf } },
                },
              },
            },
          },
        },
      });

      return this.resetCache();
    } catch (error) {
      console.log('Visitante Add Service = ', error);

      throw error;
    }
  }

  async updateAvailableStatus({
    cpf,
    id,
    ownerId,
    justifications,
  }: {
    id: string;
    ownerId: string;
    cpf: string;
    justifications: Array<Pick<Justification, 'description'>>;
  }) {
    try {
      const allJustification = await this.prisma.justification.findMany();

      //  IF visitant belongs to owner
      await this.prisma.user.findUniqueOrThrow({
        where: {
          id,
          owner: {
            id: ownerId,
            visitantsOnOwner: {
              some: {
                visitant: {
                  cpf,
                },
              },
            },
          },
        },
      });

      const visitant = await this.prisma.visitant.findUniqueOrThrow({
        where: {
          cpf,
        },
      });

      await this.prisma.available.update({
        where: {
          visitantId: visitant.id,
        },
        data: {
          justifications: {
            createMany: {
              skipDuplicates: true,
              data: justifications.map((justification) => ({
                justificationId: allJustification.find(
                  (just) => just.description === justification.description,
                ).id,
              })),
            },
          },
          status: 'PROCESSING',
        },
      });
      this.resetCache();
    } catch (error) {
      console.log('Visitante Update availabe Service = ', error);

      throw error;
    }
  }
}
