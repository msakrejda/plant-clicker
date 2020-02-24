import { observable, action } from 'mobx'

export const random = {
  number: (upTo: number = 1, startingAt: number = 0): number => Math.random() * (upTo - startingAt) + startingAt,
  integer: (upTo: number = 1, startingAt: number = 0): number => Math.round(random.number(upTo, startingAt)),
  element: <T>(array: T[]): T => array[random.integer(array.length - 1)],
  pctChance: (pct: number): boolean => Math.random() < (pct / 100)
}

export type PlantInfo = {
  icon: string
  germinationTime: number
  productionTime: number
  lifeSpan: number
}

export const Plants = {
  tomato: {
    icon: '🍅',
    germinationTime: 10,
    productionTime: 50,
    lifeSpan: 100,
  },
  kale: {
    icon: '💩',
    germinationTime: 20,
    productionTime: 30,
    lifeSpan: 80,
  },
} as const

export type PlantKind = keyof typeof Plants

export type PlantState = 'germinating' | 'growing' | 'producing' | 'dead'

export class Plant {
  constructor(readonly plantedOn: number, readonly kind: PlantKind) {}

  state (now: number): PlantState {
    const info = Plants[this.kind]
    const elapsed = now - this.plantedOn
    if (elapsed > info.lifeSpan) {
      return 'dead'
    } else if (elapsed > info.productionTime) {
      return 'producing'
    } else if (elapsed > info.germinationTime) {
      return 'growing'
    } else {
      return 'germinating'
    }
  }
}

export class Harvested {
  constructor(readonly harvestedOn: number, readonly plant: Plant) {}
}

export class BedSection {
  @observable item: Plant | undefined

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
  @observable sections: BedSection[] = Array(8).fill(undefined).map(s => new BedSection())

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

export class World {
  @observable beds: Bed[] = []
  @observable stores: Harvested[] = []

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
