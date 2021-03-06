import PropTypes from "prop-types";
import React from "react";
import { Trans } from "@lingui/macro";

import { DCOS_CHANGE } from "#SRC/js/constants/EventTypes";
import DCOSStore from "#SRC/js/stores/DCOSStore";
import MesosStateStore from "#SRC/js/stores/MesosStateStore";
import Loader from "#SRC/js/components/Loader";

import ServiceItemNotFound from "../../components/ServiceItemNotFound";
import VolumeDetail from "./VolumeDetail";

const METHODS_TO_BIND = ["onStoreChange"];

class TaskVolumeContainer extends React.Component {
  constructor() {
    super(...arguments);

    this.state = {
      isLoading: !DCOSStore.serviceDataReceived,
      lastUpdate: 0
    };

    METHODS_TO_BIND.forEach(method => {
      this[method] = this[method].bind(this);
    });
  }

  componentDidMount() {
    DCOSStore.addChangeListener(DCOS_CHANGE, this.onStoreChange);
  }

  componentWillUnmount() {
    DCOSStore.removeChangeListener(DCOS_CHANGE, this.onStoreChange);
  }

  onStoreChange() {
    // Throttle updates from DCOSStore
    if (
      Date.now() - this.state.lastUpdate > 1000 ||
      (DCOSStore.serviceDataReceived && this.state.isLoading)
    ) {
      this.setState({
        isLoading: !DCOSStore.serviceDataReceived,
        lastUpdate: Date.now()
      });
    }
  }

  render() {
    const { taskID, volumeID } = this.props.params;
    const task = MesosStateStore.getTaskFromTaskID(taskID);
    const service = DCOSStore.serviceTree.getServiceFromTaskID(task.getId());
    const volumeId = decodeURIComponent(volumeID);

    if (this.state.isLoading) {
      return <Loader />;
    }

    if (!service) {
      return (
        <ServiceItemNotFound
          message={
            <Trans render="span">
              The service with the ID of "{taskID}" could not be found.
            </Trans>
          }
        />
      );
    }

    const volume = service.getVolumes().findItem(volume => {
      return volume.getId() === volumeId;
    });

    if (!volume) {
      return (
        <ServiceItemNotFound
          message={
            <Trans render="span">Volume '{volumeId}' was not found.</Trans>
          }
        />
      );
    }

    return <VolumeDetail service={service} volume={volume} />;
  }
}

TaskVolumeContainer.propTypes = {
  params: PropTypes.object.isRequired
};

module.exports = TaskVolumeContainer;
