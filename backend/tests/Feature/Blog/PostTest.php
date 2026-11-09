<?php

use App\Models\User;
use App\Modules\Blog\Domain\Models\Post;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Role::findOrCreate('Admin');
    $this->admin = User::factory()->create();
    $this->admin->assignRole('Admin');
});

test('a guest can list published posts only', function () {
    Post::factory()->published()->count(2)->create();
    Post::factory()->draft()->create();

    $response = $this->getJson('/api/v1/posts');

    $response->assertOk()->assertJsonCount(2, 'data');
});

test('a guest can view a published post by slug', function () {
    $post = Post::factory()->published()->create();

    $response = $this->getJson("/api/v1/posts/{$post->slug}");

    $response->assertOk()->assertJsonPath('data.id', $post->id);
});

test('a guest gets a 404 for a draft post slug', function () {
    $post = Post::factory()->draft()->create();

    $response = $this->getJson("/api/v1/posts/{$post->slug}");

    $response->assertStatus(404);
});

test('an admin sees drafts in the list and can view one by slug', function () {
    Post::factory()->published()->count(2)->create();
    $draft = Post::factory()->draft()->create();

    $listResponse = $this->actingAs($this->admin)->getJson('/api/v1/posts');
    $listResponse->assertOk()->assertJsonCount(3, 'data');

    $showResponse = $this->actingAs($this->admin)->getJson("/api/v1/posts/{$draft->slug}");
    $showResponse->assertOk()->assertJsonPath('data.id', $draft->id);
});

test('a guest cannot create, update, or delete a post', function () {
    $post = Post::factory()->create();

    $this->postJson('/api/v1/posts', [])->assertStatus(401);
    $this->putJson("/api/v1/posts/{$post->id}", [])->assertStatus(401);
    $this->deleteJson("/api/v1/posts/{$post->id}")->assertStatus(401);
});

test('an authenticated user without the Admin role cannot manage posts', function () {
    $post = Post::factory()->create();
    $nonAdmin = User::factory()->create();

    $this->actingAs($nonAdmin)->postJson('/api/v1/posts', [])->assertStatus(403);
    $this->actingAs($nonAdmin)->putJson("/api/v1/posts/{$post->id}", [])->assertStatus(403);
    $this->actingAs($nonAdmin)->deleteJson("/api/v1/posts/{$post->id}")->assertStatus(403);
});

test('an admin can create a post and its slug auto-generates from the title', function () {
    $payload = [
        'title' => 'Guide d\'achat immobilier à Marrakech',
        'excerpt' => 'Un guide complet.',
        'body' => 'Contenu en Markdown.',
        'status' => 'draft',
    ];

    $response = $this->actingAs($this->admin)->postJson('/api/v1/posts', $payload);

    $response->assertCreated()
        ->assertJsonPath('data.title', $payload['title'])
        ->assertJsonPath('data.slug', 'guide-dachat-immobilier-a-marrakech');

    $this->assertDatabaseHas('posts', ['title' => $payload['title'], 'slug' => 'guide-dachat-immobilier-a-marrakech']);
});

test('creating a post enforces slug uniqueness by appending a suffix', function () {
    Post::factory()->create(['title' => 'Investir à Marrakech', 'slug' => 'investir-a-marrakech']);

    $response = $this->actingAs($this->admin)->postJson('/api/v1/posts', [
        'title' => 'Investir à Marrakech',
        'body' => 'Autre contenu.',
        'status' => 'draft',
    ]);

    $response->assertCreated()->assertJsonPath('data.slug', 'investir-a-marrakech-2');
});

test('creating a post requires the mandatory fields', function () {
    $response = $this->actingAs($this->admin)->postJson('/api/v1/posts', []);

    $response->assertStatus(422)->assertJsonValidationErrors(['title', 'body', 'status']);
});

test('a post marked published without an explicit published_at becomes visible immediately', function () {
    $response = $this->actingAs($this->admin)->postJson('/api/v1/posts', [
        'title' => 'Actualité du marché',
        'body' => 'Contenu.',
        'status' => 'published',
    ]);
    $response->assertCreated();
    $slug = $response->json('data.slug');

    $guestResponse = $this->getJson("/api/v1/posts/{$slug}");
    $guestResponse->assertOk();
});

test('an admin can update a post', function () {
    $post = Post::factory()->draft()->create();

    $response = $this->actingAs($this->admin)->putJson("/api/v1/posts/{$post->id}", [
        'title' => $post->title,
        'body' => $post->body,
        'status' => 'published',
    ]);

    $response->assertOk()->assertJsonPath('data.status', 'published');
    $this->assertDatabaseHas('posts', ['id' => $post->id, 'status' => 'published']);
});

test('an admin can delete a post', function () {
    $post = Post::factory()->create();

    $response = $this->actingAs($this->admin)->deleteJson("/api/v1/posts/{$post->id}");

    $response->assertOk();
    $this->assertSoftDeleted('posts', ['id' => $post->id]);
});
