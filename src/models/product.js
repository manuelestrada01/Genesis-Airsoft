// src/models/product.js

export class Product {
  constructor({ name, price, category, description, image }) {
    this.name = name;
    this.price = price;
    this.category = category;
    this.description = description;
    this.image = image; // URL en Storage
    this.createdAt = new Date();
  }
}
