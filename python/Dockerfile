FROM python:3.10.2

WORKDIR /packages
COPY pango_helpers /packages/helpers
ENV PYTHONPATH "${PYTHONPATH}:/packages"
WORKDIR /workspace

RUN useradd apps
RUN mkdir -p /home/apps && chown apps:apps /home/apps

ENV APKGS fonts-liberation

ARG PROJECT
# By copying over requirements first, we make sure that Docker will cache
# our installed requirements rather than reinstall them on every build
COPY ./$PROJECT/requirements.txt /workspace/requirements.txt
RUN pip install --upgrade pip

RUN mkdir /config
RUN pip install -r requirements.txt


