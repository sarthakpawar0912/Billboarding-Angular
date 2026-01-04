import { ApplicationConfig, provideZoneChangeDetection, importProvidersFrom } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { en_US, provideNzI18n } from 'ng-zorro-antd/i18n';
import { registerLocaleData } from '@angular/common';
import en from '@angular/common/locales/en';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import {
  PlusOutline,
  DeleteOutline,
  EditOutline,
  EyeOutline,
  PauseCircleOutline,
  PlayCircleOutline,
  BarChartOutline,
  LinkOutline,
  SearchOutline,
  CalendarOutline,
  DollarOutline,
  EnvironmentOutline,
  CheckCircleOutline,
  CloseCircleOutline,
  ExclamationCircleOutline,
  ReloadOutline,
  DownloadOutline,
  SettingOutline,
  WalletOutline,
  BankOutline,
  LineChartOutline,
  PlusCircleOutline,
  MinusCircleOutline,
  ArrowUpOutline,
  ArrowDownOutline,
  ArrowRightOutline,
  SafetyCertificateOutline,
  InfoCircleOutline,
  CheckOutline,
  LoadingOutline,
  ClockCircleOutline,
  QuestionCircleOutline
} from '@ant-design/icons-angular/icons';
import { provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';

registerLocaleData(en);

// Register ECharts components
echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent, CanvasRenderer]);

const icons = [
  PlusOutline,
  DeleteOutline,
  EditOutline,
  EyeOutline,
  PauseCircleOutline,
  PlayCircleOutline,
  BarChartOutline,
  LinkOutline,
  SearchOutline,
  CalendarOutline,
  DollarOutline,
  EnvironmentOutline,
  CheckCircleOutline,
  CloseCircleOutline,
  ExclamationCircleOutline,
  ReloadOutline,
  DownloadOutline,
  SettingOutline,
  WalletOutline,
  BankOutline,
  LineChartOutline,
  PlusCircleOutline,
  MinusCircleOutline,
  ArrowUpOutline,
  ArrowDownOutline,
  ArrowRightOutline,
  SafetyCertificateOutline,
  InfoCircleOutline,
  CheckOutline,
  LoadingOutline,
  ClockCircleOutline,
  QuestionCircleOutline
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withViewTransitions()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
    provideNzI18n(en_US),
    provideNzIcons(icons),
    provideEchartsCore({ echarts })
  ]
};
