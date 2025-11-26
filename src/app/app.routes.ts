import { Routes } from '@angular/router';
import { BoardListComponent } from './components/board-list/board-list.component';
import { BoardViewComponent } from './components/board-view/board-view.component';

export const routes: Routes = [
  { path: '', component: BoardListComponent },
  { path: 'board/:id', component: BoardViewComponent },
  { path: '**', redirectTo: '' }
];
