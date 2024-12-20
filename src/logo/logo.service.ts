import { Injectable } from '@nestjs/common';
import { logoInMemory } from 'src/libs/memory-cache';
import { getBrandByDomain, getBrandByName } from 'src/service/googleKnowledge';

@Injectable()
export class LogoService {
  async getLogo({ name }: { name: string }) {
    try {
      const reference = `logo-${name}`;
      if (!logoInMemory.hasItem(reference)) {
        const brands = await getBrandByName({ name });

        const domain = brands.data.some(
          (brand) => brand.name.toLowerCase() === name.toLowerCase(),
        )
          ? brands.data.find(
              (brand) => brand.name.toLowerCase() === name.toLowerCase(),
            ).domain
          : brands.data[0].domain;

        const logo = await getBrandByDomain({ domain });

        const url = logo.data.logos.find((lg) => lg.theme === 'dark')
          ?.formats[0].src;

        logoInMemory.storeExpiringItem(
          reference,
          url,
          process.env.NODE_ENV === 'test' ? 5 : 3600 * 24, // if test env expire in 5 miliseconds else 1 day
        );
      }
      return logoInMemory.retrieveItemValue(reference);
    } catch (error) {
      return null;
    }
  }
}
