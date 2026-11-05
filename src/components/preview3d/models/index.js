/** Maps catalog shapeType to the 3D model component that builds it. */
import { BedModel, BedBunkModel } from './bed.jsx';
import {
  SofaModel,
  ArmchairModel,
  ChairModel,
  DeskChairModel,
  BarStoolModel,
  OttomanModel,
} from './seating.jsx';
import {
  TableModel,
  TableRoundModel,
  CoffeeTableModel,
  SideTableModel,
  DeskModel,
  NightstandModel,
} from './tables.jsx';
import {
  WardrobeModel,
  BookshelfModel,
  ChestDrawersModel,
  SideboardModel,
  VanityDresserModel,
  CredenzaModel,
  PantryCabinetModel,
  TvModel,
} from './storage.jsx';
import { RugModel, RugRunnerModel, NepaliDhakaRugModel } from './rugs.jsx';
import {
  KitchenIslandModel,
  KitchenCounterModel,
  KitchenStoveModel,
  KitchenFridgeModel,
  DiningNookModel,
} from './kitchen.jsx';
import {
  PlantModel,
  LampModel,
  LampTripodModel,
  LampTorchiereModel,
  WallMirrorModel,
} from './decor.jsx';
import {
  NepaliChowkiModel,
  NepaliPatukaChestModel,
  NepaliBrassDiyaModel,
  NepaliPirkaModel,
  NepaliCharpaiModel,
  NepaliGaddaModel,
  NepaliDhokaDividerModel,
  NepaliPujaMandirModel,
  NepaliLotaDisplayModel,
} from './nepali.jsx';
import {
  FixtureToiletModel,
  FixtureBasinModel,
  FixtureShowerModel,
  FixtureBathtubModel,
  FixtureWasherModel,
} from './fixtures.jsx';
import { CustomMeshModel } from './customMesh.jsx';
import { FallbackBoxModel } from './fallback.jsx';
import { SofaLModel, BeanBagModel, BenchModel } from './lounge.jsx';
import { DressingTableModel, CribModel, TrunkModel } from './bedroom.jsx';
import { DeskLModel, StandingDeskModel, ReceptionCounterModel } from './office.jsx';
import { SinkUnitModel, ApplianceModel } from './kitchenUnits.jsx';
import { VanityModel, SquatToiletModel, TankModel, BasketModel } from './bathroom.jsx';
import { PlanterModel, RugRoundModel, ScreenModel } from './accents.jsx';
import { TableLampModel, MonitorModel, MicrowaveModel, BookStackModel } from './smalls.jsx';

import {
  CushionModel,
  VaseModel,
  LaptopModel,
  PhotoFrameModel,
  SpeakerModel,
  KettleModel,
  BowlModel,
  FoldedModel,
} from './tabletop.jsx';

export const MODELS = {
  bed: BedModel,
  'bed-bunk': BedBunkModel,
  sofa: SofaModel,
  armchair: ArmchairModel,
  chair: ChairModel,
  'desk-chair': DeskChairModel,
  'bar-stool': BarStoolModel,
  ottoman: OttomanModel,
  table: TableModel,
  'table-round': TableRoundModel,
  'coffee-table': CoffeeTableModel,
  'side-table': SideTableModel,
  desk: DeskModel,
  nightstand: NightstandModel,
  wardrobe: WardrobeModel,
  bookshelf: BookshelfModel,
  'chest-drawers': ChestDrawersModel,
  sideboard: SideboardModel,
  'vanity-dresser': VanityDresserModel,
  credenza: CredenzaModel,
  'pantry-cabinet': PantryCabinetModel,
  tv: TvModel,
  rug: RugModel,
  'rug-runner': RugRunnerModel,
  'nepali-dhaka-rug': NepaliDhakaRugModel,
  'kitchen-island': KitchenIslandModel,
  'kitchen-counter': KitchenCounterModel,
  'kitchen-stove': KitchenStoveModel,
  'kitchen-fridge': KitchenFridgeModel,
  'dining-nook': DiningNookModel,
  plant: PlantModel,
  lamp: LampModel,
  'lamp-tripod': LampTripodModel,
  'lamp-torchiere': LampTorchiereModel,
  'wall-mirror': WallMirrorModel,
  'nepali-chowki': NepaliChowkiModel,
  'nepali-patuka-chest': NepaliPatukaChestModel,
  'nepali-brass-diya': NepaliBrassDiyaModel,
  'nepali-pirka': NepaliPirkaModel,
  'nepali-charpai': NepaliCharpaiModel,
  'nepali-gadda': NepaliGaddaModel,
  'nepali-dhoka-divider': NepaliDhokaDividerModel,
  'nepali-puja-mandir': NepaliPujaMandirModel,
  'nepali-lota-display': NepaliLotaDisplayModel,
  'fixture-toilet': FixtureToiletModel,
  'fixture-basin': FixtureBasinModel,
  'fixture-shower': FixtureShowerModel,
  'fixture-bathtub': FixtureBathtubModel,
  'fixture-washer': FixtureWasherModel,
  'custom-mesh': CustomMeshModel,
  'sofa-l': SofaLModel,
  'bean-bag': BeanBagModel,
  bench: BenchModel,
  'dressing-table': DressingTableModel,
  crib: CribModel,
  trunk: TrunkModel,
  'desk-l': DeskLModel,
  'standing-desk': StandingDeskModel,
  'reception-counter': ReceptionCounterModel,
  'sink-unit': SinkUnitModel,
  appliance: ApplianceModel,
  vanity: VanityModel,
  'squat-toilet': SquatToiletModel,
  tank: TankModel,
  basket: BasketModel,
  planter: PlanterModel,
  'rug-round': RugRoundModel,
  screen: ScreenModel,
  'table-lamp': TableLampModel,
  monitor: MonitorModel,
  microwave: MicrowaveModel,
  'book-stack': BookStackModel,
  cushion: CushionModel,
  vase: VaseModel,
  laptop: LaptopModel,
  'photo-frame': PhotoFrameModel,
  speaker: SpeakerModel,
  kettle: KettleModel,
  bowl: BowlModel,
  folded: FoldedModel,
};

/** Unknown shape types fall back to a plain box of the catalog dimensions. */
export function resolveModel(shapeType) {
  return MODELS[shapeType] || FallbackBoxModel;
}
