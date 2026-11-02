/** Maps catalog shapeType to the 2D plan-symbol component that draws it. */
import { BedSilhouette, BedBunkSilhouette } from './bed.jsx';
import { SofaSilhouette, ArmchairSilhouette, ChairSilhouette, DeskChairSilhouette, BarStoolSilhouette, OttomanSilhouette } from './seating.jsx';
import { TableSilhouette, TableRoundSilhouette, CoffeeTableSilhouette, SideTableSilhouette, DeskSilhouette, NightstandSilhouette } from './tables.jsx';
import { WardrobeSilhouette, BookshelfSilhouette, ChestDrawersSilhouette, SideboardSilhouette, VanityDresserSilhouette, CredenzaSilhouette, PantryCabinetSilhouette, TvSilhouette } from './storage.jsx';
import { RugSilhouette, RugRunnerSilhouette, NepaliDhakaRugSilhouette } from './rugs.jsx';
import { KitchenIslandSilhouette, KitchenCounterSilhouette, KitchenStoveSilhouette, KitchenFridgeSilhouette, DiningNookSilhouette } from './kitchen.jsx';
import { PlantSilhouette, LampSilhouette, WallMirrorSilhouette } from './decor.jsx';
import { NepaliChowkiSilhouette, NepaliPatukaChestSilhouette, NepaliBrassDiyaSilhouette, NepaliPirkaSilhouette, NepaliCharpaiSilhouette, NepaliGaddaSilhouette, NepaliDhokaDividerSilhouette, NepaliPujaMandirSilhouette, NepaliLotaDisplaySilhouette } from './nepali.jsx';
import { FixtureToiletSilhouette, FixtureBasinSilhouette, FixtureShowerSilhouette, FixtureBathtubSilhouette, FixtureWasherSilhouette } from './fixtures.jsx';
import { CustomMeshSilhouette } from './customMesh.jsx';
import { SofaLSilhouette, BeanBagSilhouette, BenchSilhouette } from './lounge.jsx';
import { DressingTableSilhouette, CribSilhouette, TrunkSilhouette } from './bedroom.jsx';
import { DeskLSilhouette, StandingDeskSilhouette, ReceptionCounterSilhouette } from './office.jsx';
import { SinkUnitSilhouette, ApplianceSilhouette } from './kitchenUnits.jsx';
import { VanitySilhouette, SquatToiletSilhouette, TankSilhouette, BasketSilhouette } from './bathroom.jsx';
import { PlanterSilhouette, RugRoundSilhouette, ScreenSilhouette } from './accents.jsx';

export const SILHOUETTES = {
  'bed': BedSilhouette,
  'bed-bunk': BedBunkSilhouette,
  'sofa': SofaSilhouette,
  'armchair': ArmchairSilhouette,
  'chair': ChairSilhouette,
  'desk-chair': DeskChairSilhouette,
  'bar-stool': BarStoolSilhouette,
  'ottoman': OttomanSilhouette,
  'table': TableSilhouette,
  'table-round': TableRoundSilhouette,
  'coffee-table': CoffeeTableSilhouette,
  'side-table': SideTableSilhouette,
  'desk': DeskSilhouette,
  'nightstand': NightstandSilhouette,
  'wardrobe': WardrobeSilhouette,
  'bookshelf': BookshelfSilhouette,
  'chest-drawers': ChestDrawersSilhouette,
  'sideboard': SideboardSilhouette,
  'vanity-dresser': VanityDresserSilhouette,
  'credenza': CredenzaSilhouette,
  'pantry-cabinet': PantryCabinetSilhouette,
  'tv': TvSilhouette,
  'rug': RugSilhouette,
  'rug-runner': RugRunnerSilhouette,
  'nepali-dhaka-rug': NepaliDhakaRugSilhouette,
  'kitchen-island': KitchenIslandSilhouette,
  'kitchen-counter': KitchenCounterSilhouette,
  'kitchen-stove': KitchenStoveSilhouette,
  'kitchen-fridge': KitchenFridgeSilhouette,
  'dining-nook': DiningNookSilhouette,
  'plant': PlantSilhouette,
  'lamp': LampSilhouette,
  'wall-mirror': WallMirrorSilhouette,
  'nepali-chowki': NepaliChowkiSilhouette,
  'nepali-patuka-chest': NepaliPatukaChestSilhouette,
  'nepali-brass-diya': NepaliBrassDiyaSilhouette,
  'nepali-pirka': NepaliPirkaSilhouette,
  'nepali-charpai': NepaliCharpaiSilhouette,
  'nepali-gadda': NepaliGaddaSilhouette,
  'nepali-dhoka-divider': NepaliDhokaDividerSilhouette,
  'nepali-puja-mandir': NepaliPujaMandirSilhouette,
  'nepali-lota-display': NepaliLotaDisplaySilhouette,
  'fixture-toilet': FixtureToiletSilhouette,
  'fixture-basin': FixtureBasinSilhouette,
  'fixture-shower': FixtureShowerSilhouette,
  'fixture-bathtub': FixtureBathtubSilhouette,
  'fixture-washer': FixtureWasherSilhouette,
  'custom-mesh': CustomMeshSilhouette,
  'sofa-l': SofaLSilhouette,
  'bean-bag': BeanBagSilhouette,
  'bench': BenchSilhouette,
  'dressing-table': DressingTableSilhouette,
  'crib': CribSilhouette,
  'trunk': TrunkSilhouette,
  'desk-l': DeskLSilhouette,
  'standing-desk': StandingDeskSilhouette,
  'reception-counter': ReceptionCounterSilhouette,
  'sink-unit': SinkUnitSilhouette,
  'appliance': ApplianceSilhouette,
  'vanity': VanitySilhouette,
  'squat-toilet': SquatToiletSilhouette,
  'tank': TankSilhouette,
  'basket': BasketSilhouette,
  'planter': PlanterSilhouette,
  'rug-round': RugRoundSilhouette,
  'screen': ScreenSilhouette,
};

/** Unknown shape types fall back to the credenza-style rectangle. */
export function resolveSilhouette(shapeType) {
  return SILHOUETTES[shapeType] || CredenzaSilhouette;
}
