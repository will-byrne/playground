import { Image } from '@mantine/core';
import { Carousel } from "@mantine/carousel";

import '@mantine/carousel/styles.css';

export type SpriteEntry = {
  name: string,
  url: string,
};

export function Sprites({spriteEntries}: { spriteEntries: SpriteEntry[]}) {
  console.log(spriteEntries);
  return (
    <Carousel withIndicators height={200}>
      {spriteEntries.filter(({ url} ) => url.includes('.gif')).reverse().map(({ url }, i) => (
        <Carousel.Slide key={`sprite-${i}`}><Image h={240} width="auto" fit="contain" src={url}/></Carousel.Slide>
      ))}
    </Carousel>
  )
}