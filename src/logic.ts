import { observable, action } from 'mobx'
import { items } from './util'

export const random = {
  number: (upTo: number = 1, startingAt: number = 0): number => Math.random() * (upTo - startingAt) + startingAt,
  integer: (upTo: number = 1, startingAt: number = 0): number => Math.round(random.number(upTo, startingAt)),
  element: <T>(array: T[]): T => array[random.integer(array.length - 1)],
  pctChance: (pct: number): boolean => Math.random() < (pct / 100)
}

export type PlantInfo = {
  icon: string
  germinationScore: number
  productionScore: number
  lifeSpan: number
}

export const Plants = {
  tomato: {
    icon: '🍅',
    germinationScore: 10,
    productionScore: 50,
    lifeSpan: 100_000,
  },
  kale: {
    icon: '💩',
    germinationScore: 20,
    productionScore: 30,
    lifeSpan: 80_000,
  },
} as const

export type PlantKind = keyof typeof Plants

export type PlantState = 'germinating' | 'growing' | 'producing' | 'dead'

export class Plant {
  private points: number = 0;
  constructor(readonly plantedOn: number, readonly kind: PlantKind) {}

  state (now: number): PlantState {
    const info = Plants[this.kind]
    const elapsed = now - this.plantedOn
    if (elapsed > info.lifeSpan) {
      return 'dead'
    } else if (this.points > info.productionScore) {
      return 'producing'
    } else if (this.points > info.germinationScore) {
      return 'growing'
    } else {
      return 'germinating'
    }
  }

  tick (world: World, now: number): void {
    if (world.weather.on(now).temperature > 60) {
      this.points += 2
    } else if (world.weather.on(now).temperature > 80) {
      this.points += 3
    } else {
      this.points += 1
    }
  }
}

export class Harvested {
  constructor(readonly harvestedOn: number, readonly plant: Plant) {}
}

export class BedSection {
  @observable item: Plant | undefined

  tick (world: World, now: number) {
    this.item?.tick(world, now)
  }

  canPlant (now: number): boolean {
    return this.item === undefined || this.item.state(now) === 'dead'
  }

  @action plant (now: number, kind: PlantKind) {
    this.item = new Plant(now, kind)
  }

  canHarvest (now: number): boolean {
    return this.item !== undefined && this.item.state(now) === 'producing'
  }

  @action harvest (now: number): Harvested {
    if (!this.item) {
      throw new Error('nothing is growing here')
    }
    const result = new Harvested(now, this.item)
    this.item = undefined
    return result
  }
}

export class Bed {
  @observable sections: BedSection[] = items(8).map(_s => new BedSection())

  tick (world: World, now: number) {
    this.sections.forEach(s => s.tick(world, now))
  }

  canPlant (now: number) {
    return this.sections.some(s => s.canPlant(now))
  }

  @action plant (now: number, kind: PlantKind) {
    const unusedSection = this.sections.find(s => s.canPlant(now))
    if (!unusedSection) {
      throw new Error('no more room to plant in this bed')
    }
    unusedSection.plant(now, kind)
  }

  canHarvest (now: number): boolean {
    return this.sections.some(s => s.canHarvest(now))
  }

  @action harvest (now: number): Harvested[] {
    return this.sections.filter(s => s.canHarvest(now)).map(s => s.harvest(now))
  }
}

export type WeatherInfo = {
  temperature: number;
}

export class Weather {
  on (now: number): WeatherInfo {
    return {
      temperature:  50 + ((now / 1000) % 30)
    }
  }
}

export class World {
  @observable beds: Bed[] = []
  @observable stores: Harvested[] = []
  @observable weather: Weather = new Weather()

  constructor (readonly timeDilation: number, readonly epoch: number) {}

  tick (now: number) {
    this.beds.forEach(b => b.tick(this, now))
  }

  date (now: number) {
    const elapsed = now - this.epoch
    return new Date(this.epoch + elapsed * this.timeDilation)
  }

  @action addBed () {
    this.beds.push(new Bed())
  }

  canPlant (now: number) {
    return this.beds.some(b => b.canPlant(now))
  }

  @action plant (now: number, kind: PlantKind) {
    const availableBed = this.beds.find(b => b.canPlant(now))
    if (!availableBed) {
      throw new Error('no more room to plant in any bed')
    }
    availableBed.plant(now, kind)
  }

  canHarvest (now: number) {
    return this.beds.some(b => b.canHarvest(now))
  }

  @action harvest (now: number) {
    const harvested = this.beds.flatMap(b => b.harvest(now))
    this.stores.push(...harvested)
  }
}
