import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { compare } from 'src/libs/bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';

type ISignIn = Prisma.UserGetPayload<{
  select: {
    id: true;
    name: true;
    available: {
      select: {
        status: true;
        justifications: {
          select: {
            justification: {
              select: {
                description: true;
              };
            };
          };
        };
      };
    };
    role: {
      select: {
        id: true;
        name: true;
      };
    };
  };
}> & {
  resident?: Prisma.ResidentGetPayload<{
    select: {
      id: true;
      email: true;
      phone: true;
      photo: true;
      owner: {
        select: {
          id: true;
          house: true;
          square: true;
        };
      };
    };
  }>;
  owner?: Prisma.OwnerGetPayload<{
    select: {
      id: true;
      house: true;
      square: true;
      phone: true;
      photo: true;
      email: true;
    };
  }>;
  admin?: Prisma.AdminGetPayload<{
    select: {
      id: true;
      phone: true;
      photo: true;
      email: true;
    };
  }>;
  root?: Prisma.RootGetPayload<{ select: { id: true; email: true } }>;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async signInOwnerOrResident({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) {
    try {
      const user: ISignIn = await this.findOwnerOrResident({
        email,
        pass: password,
      });

      if (user.available.status !== 'ALLOWED')
        throw new Error(
          `Usuário com acesso impedido por: 
          <ul>
           ${user.available.justifications.map((jus) => '<li>' + jus.justification.description + '</li>').join('')}
          <ul>
           `,
        );

      const payload = { email, id: user.id, role: user.role };

      return {
        access_token: await this.jwtService.signAsync(payload),
        user: {
          id: user.id,
          role: user.role,
          name: user.name,
          email: user.owner ? user.owner.email : user.resident.email,
          phone: user.owner ? user.owner.phone : user.resident.phone,
          photo: user.owner ? user.owner.photo : user.resident.photo,
          house: user.owner ? user.owner.house : user.resident.owner.house,
          square: user.owner ? user.owner.square : user.resident.owner.square,
          residentId: user.resident?.id,
          ownerId: user.owner?.id,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async signInAdmin({ email, password }: { email: string; password: string }) {
    try {
      const user: ISignIn = await this.findAdmin({
        email,
        pass: password,
      });

      const payload = { email, id: user.id, role: user.role };

      return {
        access_token: await this.jwtService.signAsync(payload),
        user: {
          id: user.id,
          name: user.name,
          email: user.admin ? user.admin.email : user.root.email,
          phone: user.admin?.phone || null,
          photo: user.admin?.photo || null,
          role: user.role,
          adminId: user.admin?.id || null,
          rootId: user.root?.id || null,
        },
      };
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  private async findOwnerOrResident({
    email,
    pass,
  }: {
    email: string;
    pass: string;
  }) {
    try {
      const owner = await this.prisma.owner.findUnique({
        where: {
          email,
        },
      });

      const resident = await this.prisma.resident.findUnique({
        where: {
          email,
        },
      });

      if (Boolean(owner) && compare(pass, owner.password)) {
        return await this.prisma.user.findUniqueOrThrow({
          where: { id: owner.userId },
          select: {
            name: true,
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
            id: true,
            role: { select: { name: true, id: true } },
            owner: {
              select: {
                email: true,
                id: true,
                phone: true,
                photo: true,
                cpf: true,
                house: true,
                square: true,
              },
            },
          },
        });
      }

      if (Boolean(resident) && compare(pass, resident.password)) {
        return await this.prisma.user.findUniqueOrThrow({
          where: { id: resident.userId },
          select: {
            name: true,
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
            id: true,
            role: { select: { name: true, id: true } },
            resident: {
              select: {
                id: true,
                cpf: true,
                email: true,
                phone: true,
                photo: true,
                owner: {
                  select: {
                    id: true,
                    house: true,
                    square: true,
                  },
                },
              },
            },
          },
        });
      }
    } catch (error) {
      console.error(error);

      throw error;
    }
  }

  private async findAdmin({ email, pass }: { email: string; pass: string }) {
    try {
      const admin = await this.prisma.admin.findUnique({
        where: {
          email,
        },
      });

      const root = await this.prisma.root.findUnique({
        where: {
          email,
        },
      });

      if (
        (!!admin && compare(pass, admin.password)) ||
        (!!root && compare(pass, root.password))
      ) {
        return await this.prisma.user.findUniqueOrThrow({
          where: {
            id: admin?.userId || root.userId,
            available: { status: 'ALLOWED' },
          },
          select: {
            name: true,
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
            id: true,
            role: { select: { name: true, id: true } },
            ...(admin && {
              admin: {
                select: {
                  email: true,
                  id: true,
                  phone: true,
                  photo: true,
                },
              },
            }),
            ...(root && {
              root: {
                select: {
                  id: true,
                  email: true,
                },
              },
            }),
          },
        });
      }
    } catch (error) {
      console.error(error);

      throw error;
    }
  }
}
