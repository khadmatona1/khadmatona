<?php

namespace App\Modules\Contact\Database\Factories;

use App\Modules\Contact\Domain\Enums\ContactType;
use App\Modules\Contact\Domain\Models\Contact;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Contact>
 */
class ContactFactory extends Factory
{
    protected $model = Contact::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'type' => fake()->randomElement(ContactType::cases()),
            'name' => fake()->name(),
            'email' => fake()->safeEmail(),
            'phone' => '0' . fake()->numerify('#########'),
            'whatsapp' => null,
            'address' => fake()->address(),
            'notes' => null,
        ];
    }
}
