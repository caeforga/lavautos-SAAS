import { test,expect } from '@playwright/test';
test.beforeEach(async({page})=>{await page.goto('/');await page.getByRole('button',{name:'Explorar demostración'}).click();await expect(page.getByRole('heading',{name:'Todo en orden.'})).toBeVisible();});
async function nav(page:any,name:string){const toggle=page.getByRole('button',{name:'Abrir menú'});if(await toggle.isVisible())await toggle.click();await page.getByRole('button',{name,exact:true}).click();}
test('crea una orden, cobra pago dividido y descarga boleta',async({page})=>{
 await page.getByRole('button',{name:'Nueva orden',exact:true}).click();
 await page.getByLabel('Placa del vehículo').fill('TST 123');
 await page.getByLabel('Servicio o producto').selectOption({label:'Lavado completo · $ 35.000'}).catch(async()=>{await page.getByLabel('Servicio o producto').selectOption({index:1});});
 await page.getByRole('button',{name:'Agregar',exact:true}).click();
 await page.getByRole('button',{name:'Crear orden',exact:true}).click();
 await nav(page,'Órdenes de servicio');await page.getByRole('button',{name:'Ver orden TST 123'}).click();
 await page.getByRole('button',{name:/Cobrar/}).click();
 await page.getByLabel('Efectivo',{exact:true}).fill('20000');await page.getByLabel('Transferencia',{exact:true}).fill('15000');
 await page.getByRole('button',{name:'Guardar',exact:true}).click();
 await expect(page.getByRole('button',{name:/Cobrar/})).toHaveCount(0);
 await page.getByLabel('Estado Lavado completo').selectOption('done');
 await page.getByRole('button',{name:'Ver boleta'}).click();await expect(page.getByText('PAGADO',{exact:true})).toBeVisible();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'PDF',exact:true}).click();expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
});
test('guarda operación sin internet y la recupera después de recargar',async({page,context})=>{
 await page.waitForFunction(()=>document.documentElement.dataset.offlineReady==='true');
 await context.setOffline(true);
 await page.getByRole('button',{name:'Nueva orden',exact:true}).click();await page.getByLabel('Placa del vehículo').fill('OFF 456');await page.getByLabel('Servicio o producto').selectOption({index:1});await page.getByRole('button',{name:'Agregar',exact:true}).click();await page.getByRole('button',{name:'Crear orden',exact:true}).click();
 await nav(page,'Sincronización');await expect(page.getByText(/OFF 456 ·/)).toBeVisible();
 await page.reload();await page.getByRole('button',{name:'Explorar demostración'}).click();await nav(page,'Órdenes de servicio');await expect(page.getByRole('button',{name:'Ver orden OFF 456'})).toBeVisible();
 await context.setOffline(false);await nav(page,'Sincronización');await page.getByRole('button',{name:'Sincronizar ahora'}).click();await expect(page.getByRole('heading',{name:'Todo al día en este dispositivo'})).toBeVisible();
});
test('administra equipo, inventario, sede y reportes sin desbordar la pantalla',async({page},testInfo)=>{
 await nav(page,'Mi equipo');await page.getByRole('button',{name:'Agregar trabajador'}).click();await page.getByLabel('Nombre completo').fill('Laura Prueba');await page.getByRole('button',{name:'Guardar',exact:true}).click();await expect(page.getByRole('heading',{name:'Laura Prueba'})).toBeVisible();
 await nav(page,'Servicios y productos');await page.getByRole('button',{name:'Movimiento',exact:true}).first().click();await page.getByLabel('Cantidad').fill('5');await page.getByLabel('Motivo del movimiento').fill('Entrada de prueba');await page.getByRole('button',{name:'Guardar',exact:true}).click();await expect(page.getByText('Entrada de prueba',{exact:true})).toBeVisible();
 await nav(page,'Reportes');const download=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar órdenes CSV'}).click();expect((await download).suggestedFilename()).toContain('reporte-');
 await nav(page,'Vista general');await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.screenshot({path:`test-results/dashboard-${testInfo.project.name}.png`,fullPage:true});
});
