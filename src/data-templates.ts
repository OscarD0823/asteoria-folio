import {creationTemplate} from './template-catalog';
export function dataTemplate(id:string){const template=creationTemplate('data',id);const definitions:Record<string,{table:string;sql:string}>={
 contacts:{table:'Contactos',sql:'CREATE TABLE Contactos(id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, correo TEXT, telefono TEXT, organizacion TEXT);'},
 inventory:{table:'Productos',sql:'CREATE TABLE Categorias(id INTEGER PRIMARY KEY,nombre TEXT NOT NULL); CREATE TABLE Productos(id INTEGER PRIMARY KEY,nombre TEXT NOT NULL,categoria_id INTEGER REFERENCES Categorias(id),existencias INTEGER NOT NULL DEFAULT 0,costo REAL NOT NULL DEFAULT 0); CREATE INDEX Productos_categoria ON Productos(categoria_id);'},
 tasks:{table:'Tareas',sql:"CREATE TABLE Responsables(id INTEGER PRIMARY KEY,nombre TEXT NOT NULL); CREATE TABLE Tareas(id INTEGER PRIMARY KEY,titulo TEXT NOT NULL,responsable_id INTEGER REFERENCES Responsables(id),fecha TEXT,estado TEXT NOT NULL DEFAULT 'Pendiente');"},
 blank:{table:'',sql:''},
 };return {...definitions[id],name:template.title};}
