import React, { useContext, useState, useEffect } from 'react'
import { observer } from 'mobx-react'

import { World, Bed, Harvested, Plants, BedSection } from './logic'

const WorldContext = React.createContext<World>(new World())

const useWorld = () => {
  return useContext(WorldContext)
}

const useNow = (seconds: number):number => {
  const [ now, setNow ] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now())
    }, seconds * 1000)
    return () => clearInterval(id)
  }, [ seconds ])
  return now / 1000
}

const useUpdateEvery = (seconds: number, updateFn: (now: number) => void, deps?: React.DependencyList | undefined):void => {
  const now = useNow(seconds)
  useEffect(() => {
    updateFn(now)
  }, deps === undefined ? [ now ] : deps.concat(now))
}

export const WorldView: React.FC = observer(() => {
  const world = useWorld()
  const now = useNow(1)

  const canPlant = world.canPlant(now)
  const canHarvest = world.canHarvest(now)

  const handleAddBedClick = () => {
    world.addBed()
  }

  const handlePlantKaleClick = () => {
    world.plant(now, 'kale')
  }

  const handlePlantTomatoClick = () => {
    world.plant(now, 'tomato')
  }

  const handleHarvestClick = () => {
    world.harvest(now)
  }

  return (
    <div>
      <h1>my garden</h1>
      <div style={{display: 'flex'}}>
        <div>
          {world.beds.map(b => (
            <BedView now={now} bed={b} />
          ))}
        </div>
        <div>
          <button onClick={handleAddBedClick}>add bed</button>
          <button disabled={!canPlant} onClick={handlePlantKaleClick}>plant kale</button>
          <button disabled={!canPlant} onClick={handlePlantTomatoClick}>plant tomato</button>
          <button disabled={!canHarvest} onClick={handleHarvestClick}>harvest</button>
          <StoreView stores={world.stores} />
        </div>
      </div>
    </div>
  )
})

const BedView: React.FC<{now: number, bed: Bed}> = observer(({now, bed}) => {
  return (
    <div style={{
      display: 'flex',
      backgroundColor: 'tan',
      border: '1px solid brown',
      margin: '30px',
      width: '300px',
      height: '50px'
    }}>
      {bed.sections.map((s, i) => {
        return <BedSectionView now={now} section={s} />
      })}
    </div>
  )
})

const BedSectionView: React.FC<{now: number, section: BedSection}> = observer(({now, section}) => {
  const { item } = section
  let icon: string
  if (!item) {
    icon = '…'
  } else {
    const state = item.state(now)
    if (state === 'germinating') {
      icon = '…'
    } else if (state === 'growing') {
      icon = '🌱'
    } else if (state === 'producing') {
      icon = Plants[item.kind].icon
    } else {
      icon = '☠'
    }
  }

  const backgroundColor = section.item && 'green'
  return (
    <div style={{ textAlign: 'center', verticalAlign: 'middle', backgroundColor, height: '100%', width: '100%' }}>
      {icon}
    </div>
  )
})

const StoreView: React.FC<{stores: Harvested[]}> = observer(({stores}) => {
  const counts = stores.reduce<{ [key: string]: number }>((summary, next) => {
    const kind = next.plant.kind
    if (!(kind in summary)) {
      summary[kind] = 0
    }
    summary[kind] += 1
    return summary
  }, {})
  return (
    <div>
      <ul>
        {Object.entries(counts).map(([plantKind, count]) => {
          return <li>{plantKind}: {count}</li>
        })}
      </ul>
    </div>
  )
})
