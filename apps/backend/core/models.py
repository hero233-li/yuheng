import socket
import uuid

from django.db import models


def default_machine_id():
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, socket.gethostname()))


class Setting(models.Model):
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField(blank=True, default="")
    updated_at = models.DateTimeField(auto_now=True)

    @classmethod
    def get_value(cls, key, default=""):
        row, _ = cls.objects.get_or_create(key=key, defaults={"value": default})
        return row.value

    @classmethod
    def set_value(cls, key, value):
        row, _ = cls.objects.update_or_create(key=key, defaults={"value": value})
        return row


class LocalAccount(models.Model):
    username = models.CharField(max_length=100, unique=True)
    password = models.CharField(max_length=200)
    terminal_name = models.CharField(max_length=100, default="terminal001")
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @classmethod
    def ensure_default(cls):
        account, _ = cls.objects.get_or_create(
            username="user",
            defaults={"password": "terminal001", "terminal_name": "terminal001"},
        )
        return account
